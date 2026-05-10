<?php
/**
 * Tickets de support — CPT, REST API et notifications email.
 *
 * Flux : utilisateur soumet via /api/tickets côté Next → relayé vers
 * /tim-support/v1/tickets ici → CPT support_ticket créé + emails envoyés.
 *
 * Anti-spam : honeypot (champ "website" qui doit rester vide) + rate-limit
 * 3 tickets / IP / heure via transients.
 *
 * Pour personnaliser l'adresse de notification admin :
 *   define( 'TIM_TICKETS_NOTIFY_EMAIL', 'support@tim-management.co' );
 * dans wp-config.php. Sinon admin_email est utilisé.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Types acceptés en CRÉATION (validation REST). 'bug' a été retiré : les
// remontées de problèmes passent maintenant par 'assistance' avec captures.
const TIM_TICKET_TYPES = [ 'assistance', 'suggestion', 'autre' ];

// 5 statuts couvrant le cycle de vie complet d'un ticket client.
const TIM_TICKET_STATUSES = [ 'new', 'acknowledged', 'in_progress', 'on_hold', 'resolved' ];

// 4 niveaux de priorité — modifiables en ligne depuis la liste admin.
const TIM_TICKET_PRIORITIES = [ 'urgent', 'high', 'normal', 'low' ];

// Labels d'AFFICHAGE — on garde 'bug' et 'closed' pour que les anciens tickets
// continuent de s'afficher correctement dans l'admin.
const TIM_TICKET_TYPE_LABELS = [
    'assistance' => '💬 Assistance',
    'bug'        => '🐛 Bug',
    'suggestion' => '💡 Suggestion',
    'autre'      => '✉️ Autre',
];

const TIM_TICKET_STATUS_LABELS = [
    'new'          => '🆕 À traiter',
    'acknowledged' => '👀 Pris en compte',
    'in_progress'  => '⚙️ En cours',
    'on_hold'      => '⏸️ En attente',
    'resolved'     => '✅ Résolu',
    // legacy — n'apparaît plus dans le select mais s'affiche correctement si
    // un ticket avait ce statut avant la migration.
    'closed'       => '🔒 Archivé',
];

// Couleurs des badges de statut (utilisées dans la liste admin).
const TIM_TICKET_STATUS_COLORS = [
    'new'          => '#dc2626', // rouge — demande attention
    'acknowledged' => '#ea580c', // orange — vu, en triage
    'in_progress'  => '#2563eb', // bleu — en cours
    'on_hold'      => '#ca8a04', // jaune — bloqué/attente
    'resolved'     => '#16a34a', // vert — terminé
    'closed'       => '#6b7280', // gris — archivé
];

// Priorités : weight pour le tri (1 = plus urgent), label, couleur.
const TIM_TICKET_PRIORITY_DATA = [
    'urgent' => [ 'weight' => 1, 'label' => '🔴 Urgente', 'color' => '#dc2626' ],
    'high'   => [ 'weight' => 2, 'label' => '🟠 Élevée',  'color' => '#ea580c' ],
    'normal' => [ 'weight' => 3, 'label' => '🟡 Normale', 'color' => '#ca8a04' ],
    'low'    => [ 'weight' => 4, 'label' => '⚪ Basse',   'color' => '#9ca3af' ],
];

// Services destinataires pour les demandes "Autre" (ne sont pas liées à une
// fonctionnalité du logiciel mais à une équipe interne).
const TIM_TICKET_SERVICES = [ 'technique', 'facturation', 'support', 'commercial', 'autre' ];

const TIM_TICKET_SERVICE_LABELS = [
    'technique'   => '🔧 Service technique',
    'facturation' => '💰 Service facturation',
    'support'     => '🎯 Service support',
    'commercial'  => '💼 Service commercial',
    'autre'       => '❓ Autre service',
];

// Limites d'upload des captures d'écran
const TIM_TICKET_MAX_FILES     = 5;
const TIM_TICKET_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const TIM_TICKET_ALLOWED_MIMES = [ 'image/jpeg', 'image/png', 'image/gif', 'image/webp' ];
const TIM_TICKET_ALLOWED_EXTS  = [ 'jpg', 'jpeg', 'png', 'gif', 'webp' ];

// Délai (en jours) entre passage à 'resolved' et suppression auto des captures.
// 30 jours laisse une fenêtre confortable au cas où le ticket est rouvert
// (feedback client tardif, complément d'information, etc.).
// 0 = suppression immédiate. Override possible dans wp-config.php :
//   define( 'TIM_TICKETS_PURGE_DELAY_DAYS', 60 );
if ( ! defined( 'TIM_TICKETS_PURGE_DELAY_DAYS' ) ) {
    define( 'TIM_TICKETS_PURGE_DELAY_DAYS', 30 );
}

// ─── CPT ─────────────────────────────────────────────────────────────────────

add_action( 'init', function () {
    register_post_type( 'support_ticket', [
        'labels' => [
            'name'               => 'Tickets',
            'singular_name'      => 'Ticket',
            'menu_name'          => 'Tickets support',
            'add_new'            => 'Ajouter',
            'add_new_item'       => 'Ajouter un ticket',
            'edit_item'          => 'Modifier le ticket',
            'view_item'          => 'Voir le ticket',
            'search_items'       => 'Rechercher un ticket',
            'not_found'          => 'Aucun ticket trouvé.',
            'not_found_in_trash' => 'Aucun ticket dans la corbeille.',
            'all_items'          => 'Tous les tickets',
        ],
        'public'          => false,
        'show_ui'         => true,
        'show_in_menu'    => true,
        'menu_icon'       => 'dashicons-email-alt',
        'menu_position'   => 25,
        'supports'        => [ 'title', 'editor' ],
        'show_in_rest'    => false,
        'capability_type' => 'post',
        'has_archive'     => false,
        'rewrite'         => false,
    ] );
} );

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _tim_client_ip(): string {
    foreach ( [ 'HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR' ] as $h ) {
        if ( ! empty( $_SERVER[ $h ] ) ) {
            $ip = explode( ',', sanitize_text_field( wp_unslash( $_SERVER[ $h ] ) ) )[0];
            return trim( $ip );
        }
    }
    return '';
}

/**
 * Définit la priorité d'un ticket. Stocke à la fois le slug ('urgent', 'high'…)
 * et le poids numérique pour permettre un tri SQL natif via meta_value_num.
 */
function _tim_set_ticket_priority( int $post_id, string $priority ): void {
    if ( ! isset( TIM_TICKET_PRIORITY_DATA[ $priority ] ) ) {
        $priority = 'normal';
    }
    update_post_meta( $post_id, '_ticket_priority',        $priority );
    update_post_meta( $post_id, '_ticket_priority_weight', TIM_TICKET_PRIORITY_DATA[ $priority ]['weight'] );
}

/**
 * Génère un numéro de ticket aléatoire non-séquentiel et garantit l'unicité
 * via une vérification SQL. Plage 100–99999 (3 à 5 chiffres).
 */
function _tim_generate_ticket_number(): int {
    global $wpdb;
    for ( $i = 0; $i < 20; $i++ ) {
        $num = wp_rand( 100, 99999 );
        $exists = $wpdb->get_var( $wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_ticket_number' AND meta_value = %s LIMIT 1",
            $num
        ) );
        if ( ! $exists ) return $num;
    }
    // Fallback très improbable : numéro à 6 chiffres
    return wp_rand( 100000, 999999 );
}

/**
 * Récupère le numéro de ticket. Lazy-backfill : génère et stocke à la 1ʳᵉ
 * lecture pour les tickets créés avant l'introduction des numéros.
 */
function _tim_get_ticket_number( int $post_id ): int {
    $num = (int) get_post_meta( $post_id, '_ticket_number', true );
    if ( $num > 0 ) return $num;
    $num = _tim_generate_ticket_number();
    update_post_meta( $post_id, '_ticket_number', $num );
    return $num;
}

/**
 * Wrapper unique pour modifier le statut d'un ticket.
 * Centralise les effets de bord :
 *   - passage à 'resolved' → planifie la purge des captures
 *   - sortie de 'resolved' → annule la purge planifiée
 * Toutes les voies d'écriture (Quick Edit, méta-box, bulk) doivent passer ici.
 */
function _tim_set_ticket_status( int $post_id, string $new_status ): void {
    if ( ! in_array( $new_status, TIM_TICKET_STATUSES, true ) ) return;

    $old_status = get_post_meta( $post_id, '_ticket_status', true ) ?: 'new';
    if ( $new_status === $old_status ) return;

    update_post_meta( $post_id, '_ticket_status', $new_status );

    // Transition vers résolu
    if ( $new_status === 'resolved' && $old_status !== 'resolved' ) {
        update_post_meta( $post_id, '_ticket_resolved_at', time() );
        _tim_schedule_attachments_purge( $post_id );
    }

    // Réouverture (ex: feedback client après résolution) → annule la purge
    if ( $new_status !== 'resolved' && $old_status === 'resolved' ) {
        $ts = wp_next_scheduled( 'tim_purge_ticket_attachments', [ $post_id ] );
        if ( $ts ) wp_unschedule_event( $ts, 'tim_purge_ticket_attachments', [ $post_id ] );
    }

    do_action( 'tim_ticket_status_changed', $post_id, $new_status, $old_status );
}

/**
 * Programme la suppression des captures d'écran X jours après la résolution.
 * Si X = 0, suppression immédiate.
 */
function _tim_schedule_attachments_purge( int $post_id ): void {
    $delay = (int) TIM_TICKETS_PURGE_DELAY_DAYS;

    if ( $delay <= 0 ) {
        _tim_purge_ticket_attachments( $post_id );
        return;
    }

    if ( ! wp_next_scheduled( 'tim_purge_ticket_attachments', [ $post_id ] ) ) {
        wp_schedule_single_event( time() + ( $delay * DAY_IN_SECONDS ), 'tim_purge_ticket_attachments', [ $post_id ] );
    }
}

/**
 * Supprime physiquement les captures d'écran d'un ticket et marque la trace.
 * Idempotent : si déjà purgé, rien à faire.
 */
function _tim_purge_ticket_attachments( int $post_id ): void {
    $attachments = get_post_meta( $post_id, '_ticket_attachments', true );
    if ( ! is_array( $attachments ) || empty( $attachments ) ) return;

    $deleted = 0;
    foreach ( $attachments as $att_id ) {
        if ( wp_delete_attachment( (int) $att_id, true ) !== false ) {
            $deleted++;
        }
    }

    delete_post_meta( $post_id, '_ticket_attachments' );
    update_post_meta( $post_id, '_ticket_attachments_purged_at', time() );
    update_post_meta( $post_id, '_ticket_attachments_purged_count', $deleted );
}

// Le hook qui déclenche la purge depuis WP-Cron.
add_action( 'tim_purge_ticket_attachments', '_tim_purge_ticket_attachments' );

function _tim_notify_admin_new_ticket( int $post_id, array $attached = [] ): void {
    $to = defined( 'TIM_TICKETS_NOTIFY_EMAIL' )
        ? TIM_TICKETS_NOTIFY_EMAIL
        : get_option( 'admin_email' );

    $num      = _tim_get_ticket_number( $post_id );
    $subject  = get_the_title( $post_id );
    $type     = get_post_meta( $post_id, '_ticket_type',    true );
    $email    = get_post_meta( $post_id, '_ticket_email',   true );
    $name     = get_post_meta( $post_id, '_ticket_name',    true );
    $url      = get_post_meta( $post_id, '_ticket_url',     true );
    $service  = get_post_meta( $post_id, '_ticket_service', true );
    $content  = get_post_field( 'post_content', $post_id );
    $admin_link = admin_url( 'post.php?action=edit&post=' . $post_id );

    $type_label = TIM_TICKET_TYPE_LABELS[ $type ] ?? $type;

    $body  = "Nouveau ticket reçu sur le centre d'aide TIM Management.\n\n";
    $body .= "Type    : $type_label\n";
    $body .= "Sujet   : $subject\n";
    $body .= "Auteur  : " . ( $name ?: 'Anonyme' ) . " <$email>\n";
    if ( $url )     $body .= "Page    : $url\n";
    if ( $service ) $body .= "Service : " . ( TIM_TICKET_SERVICE_LABELS[ $service ] ?? $service ) . "\n";

    if ( ! empty( $attached ) ) {
        $body .= "\nCaptures d'écran (" . count( $attached ) . ") :\n";
        foreach ( $attached as $att_id ) {
            $att_url = wp_get_attachment_url( $att_id );
            if ( $att_url ) $body .= "  - $att_url\n";
        }
    }

    $body .= "\n--- Description ---\n$content\n\n";
    $body .= "---\nGérer le ticket : $admin_link\n";

    wp_mail( $to, "[Ticket #$num] $subject", $body, [
        'Reply-To: ' . ( $name ? "$name <$email>" : $email ),
    ] );
}

/**
 * Traite les captures d'écran uploadées et les attache au ticket.
 * Retourne les IDs des attachments créés.
 */
function _tim_handle_ticket_attachments( int $post_id ): array {
    if ( empty( $_FILES ) ) return [];

    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';

    $attached = [];

    foreach ( $_FILES as $key => $file ) {
        if ( count( $attached ) >= TIM_TICKET_MAX_FILES ) break;
        if ( ! is_string( $key ) || strpos( $key, 'attachment_' ) !== 0 ) continue;

        $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
        if ( $error !== UPLOAD_ERR_OK ) continue;

        // Validation : type MIME (basé sur le contenu, pas l'extension)
        $finfo = function_exists( 'finfo_open' ) ? finfo_open( FILEINFO_MIME_TYPE ) : null;
        $mime  = $finfo ? finfo_file( $finfo, $file['tmp_name'] ) : ( $file['type'] ?? '' );
        if ( $finfo ) finfo_close( $finfo );

        if ( ! in_array( $mime, TIM_TICKET_ALLOWED_MIMES, true ) ) continue;

        // Validation : taille
        if ( ! empty( $file['size'] ) && $file['size'] > TIM_TICKET_MAX_FILE_SIZE ) continue;

        // Validation : extension cohérente avec le MIME
        $check = wp_check_filetype( $file['name'] );
        if ( ! in_array( $check['ext'], TIM_TICKET_ALLOWED_EXTS, true ) ) continue;

        // Upload
        $upload = wp_handle_upload( $file, [ 'test_form' => false ] );
        if ( ! empty( $upload['error'] ) || empty( $upload['file'] ) ) continue;

        $att_id = wp_insert_attachment( [
            'post_mime_type' => $upload['type'],
            'post_title'     => sanitize_text_field( pathinfo( $file['name'], PATHINFO_FILENAME ) ),
            'post_content'   => '',
            'post_status'    => 'inherit',
            'post_parent'    => $post_id,
        ], $upload['file'], $post_id, true );

        if ( is_wp_error( $att_id ) ) continue;

        wp_update_attachment_metadata( $att_id, wp_generate_attachment_metadata( $att_id, $upload['file'] ) );
        $attached[] = (int) $att_id;
    }

    if ( ! empty( $attached ) ) {
        update_post_meta( $post_id, '_ticket_attachments', $attached );
    }

    return $attached;
}

function _tim_notify_user_ticket_received( int $post_id ): void {
    $email   = get_post_meta( $post_id, '_ticket_email', true );
    $name    = get_post_meta( $post_id, '_ticket_name',  true );
    $subject = get_the_title( $post_id );
    $num     = _tim_get_ticket_number( $post_id );

    if ( ! is_email( $email ) ) return;

    $body  = "Bonjour" . ( $name ? " $name" : '' ) . ",\n\n";
    $body .= "Nous avons bien reçu votre demande \"$subject\".\n";
    $body .= "Notre équipe la prendra en charge dans les plus brefs délais.\n\n";
    $body .= "Référence : #$num\n\n";
    $body .= "Pour toute information complémentaire, répondez simplement à cet email.\n\n";
    $body .= "Cordialement,\nL'équipe TIM Management";

    wp_mail( $email, "[TIM Management] Demande reçue : $subject", $body );
}

// ─── REST API ────────────────────────────────────────────────────────────────

add_action( 'rest_api_init', function () {
    register_rest_route( 'tim-support/v1', '/tickets', [
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'args' => [
            'type'        => [ 'required' => true,  'type' => 'string' ],
            'subject'     => [ 'required' => true,  'type' => 'string' ],
            'description' => [ 'required' => true,  'type' => 'string' ],
            'email'       => [ 'required' => true,  'type' => 'string' ],
            'name'        => [ 'required' => false, 'type' => 'string' ],
            'url'         => [ 'required' => false, 'type' => 'string' ],
            'service'     => [ 'required' => false, 'type' => 'string' ],
            'website'     => [ 'required' => false, 'type' => 'string' ], // honeypot
        ],
        'callback' => function ( WP_REST_Request $req ) {
            // Honeypot — rempli = bot
            $hp = trim( (string) $req->get_param( 'website' ) );
            if ( $hp !== '' ) {
                return new WP_Error( 'spam', 'Spam détecté.', [ 'status' => 400 ] );
            }

            // Rate limit — 3 tickets max par IP / heure
            $ip   = _tim_client_ip();
            $key  = 'tim_ticket_rate_' . md5( $ip );
            $hits = (int) get_transient( $key );
            if ( $hits >= 3 ) {
                return new WP_Error(
                    'rate_limited',
                    "Trop de tickets soumis. Réessayez dans une heure.",
                    [ 'status' => 429 ]
                );
            }
            set_transient( $key, $hits + 1, HOUR_IN_SECONDS );

            // Sanitisation + validation
            $type        = sanitize_text_field( (string) $req->get_param( 'type' ) );
            $subject     = sanitize_text_field( (string) $req->get_param( 'subject' ) );
            $description = sanitize_textarea_field( (string) $req->get_param( 'description' ) );
            $email       = sanitize_email( (string) $req->get_param( 'email' ) );
            $name        = sanitize_text_field( (string) ( $req->get_param( 'name' ) ?? '' ) );
            $url         = esc_url_raw( (string) ( $req->get_param( 'url' ) ?? '' ) );
            $service_raw = sanitize_text_field( (string) ( $req->get_param( 'service' ) ?? '' ) );
            $service     = in_array( $service_raw, TIM_TICKET_SERVICES, true ) ? $service_raw : '';

            if ( ! in_array( $type, TIM_TICKET_TYPES, true ) ) {
                return new WP_Error( 'invalid_type', 'Type de demande invalide.', [ 'status' => 400 ] );
            }
            if ( strlen( $subject ) < 5 || strlen( $subject ) > 200 ) {
                return new WP_Error(
                    'invalid_subject',
                    'Le sujet doit faire entre 5 et 200 caractères.',
                    [ 'status' => 400 ]
                );
            }
            if ( strlen( $description ) < 10 ) {
                return new WP_Error(
                    'invalid_description',
                    'La description est trop courte (minimum 10 caractères).',
                    [ 'status' => 400 ]
                );
            }
            if ( ! is_email( $email ) ) {
                return new WP_Error( 'invalid_email', 'Email invalide.', [ 'status' => 400 ] );
            }

            // Insertion
            $post_id = wp_insert_post( [
                'post_type'    => 'support_ticket',
                'post_title'   => $subject,
                'post_content' => $description,
                'post_status'  => 'publish',
            ], true );

            if ( is_wp_error( $post_id ) ) {
                return new WP_Error(
                    'save_failed',
                    'Erreur serveur lors de la création du ticket.',
                    [ 'status' => 500 ]
                );
            }

            update_post_meta( $post_id, '_ticket_type',       $type );
            update_post_meta( $post_id, '_ticket_email',      $email );
            update_post_meta( $post_id, '_ticket_name',       $name );
            update_post_meta( $post_id, '_ticket_url',        $url );
            update_post_meta( $post_id, '_ticket_service',    $service );
            update_post_meta( $post_id, '_ticket_status',     'new' );
            update_post_meta( $post_id, '_ticket_ip',         $ip );
            update_post_meta( $post_id, '_ticket_user_agent', sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ?? '' ) ) );

            // Priorité par défaut. Modifiable ensuite par les admins via la liste
            // des tickets (Quick Edit) ou la méta-box.
            _tim_set_ticket_priority( $post_id, 'normal' );

            // Numéro de ticket aléatoire (non-séquentiel), utilisé partout côté
            // client (emails, accusé réception, admin).
            $ticket_number = _tim_get_ticket_number( $post_id );

            // Captures d'écran (uniquement type assistance, mais on ne re-vérifie
            // pas ici : si des fichiers arrivent pour un autre type, on les ignore.
            $attached = ( $type === 'assistance' ) ? _tim_handle_ticket_attachments( $post_id ) : [];

            _tim_notify_admin_new_ticket( $post_id, $attached );
            _tim_notify_user_ticket_received( $post_id );

            return rest_ensure_response( [
                'success'        => true,
                'ticket_id'      => $post_id,        // ID interne WP (utile pour la trace)
                'ticket_number'  => $ticket_number,  // numéro public affiché à l'utilisateur
                'attached_count' => count( $attached ),
            ] );
        },
    ] );
} );

// ─── Admin : colonnes personnalisées ─────────────────────────────────────────

add_filter( 'manage_support_ticket_posts_columns', function ( $cols ) {
    return [
        'cb'              => $cols['cb'] ?? '',
        'ticket_number'   => 'N°',
        'ticket_priority' => 'Priorité',
        'title'           => 'Sujet',
        'ticket_type'     => 'Type',
        'ticket_status'   => 'Statut',
        'ticket_email'    => 'Email',
        'date'            => 'Reçu le',
    ];
} );

add_filter( 'manage_edit-support_ticket_sortable_columns', function ( $cols ) {
    $cols['ticket_priority'] = 'ticket_priority';
    $cols['ticket_status']   = 'ticket_status';
    $cols['ticket_number']   = 'ticket_number';
    return $cols;
} );

add_action( 'manage_support_ticket_posts_custom_column', function ( $col, $post_id ) {
    switch ( $col ) {
        case 'ticket_number':
            echo '<strong style="font-family:monospace;color:#475569;">#' . esc_html( (string) _tim_get_ticket_number( $post_id ) ) . '</strong>';
            break;

        case 'ticket_type':
            $type = get_post_meta( $post_id, '_ticket_type', true );
            echo esc_html( TIM_TICKET_TYPE_LABELS[ $type ] ?? $type );
            break;

        case 'ticket_status':
            $status = get_post_meta( $post_id, '_ticket_status', true ) ?: 'new';
            $label  = TIM_TICKET_STATUS_LABELS[ $status ] ?? $status;
            $color  = TIM_TICKET_STATUS_COLORS[ $status ] ?? '#6b7280';
            // Valeur cachée utilisée par Quick Edit (JS) pour pré-sélectionner.
            echo '<span class="ticket_status_value" data-value="' . esc_attr( $status ) . '" '
                 . 'style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;'
                 . 'color:#fff;background:' . esc_attr( $color ) . ';">'
                 . esc_html( $label ) . '</span>';
            break;

        case 'ticket_priority':
            $prio = get_post_meta( $post_id, '_ticket_priority', true ) ?: 'normal';
            $data = TIM_TICKET_PRIORITY_DATA[ $prio ] ?? TIM_TICKET_PRIORITY_DATA['normal'];
            echo '<span class="ticket_priority_value" data-value="' . esc_attr( $prio ) . '" '
                 . 'style="font-weight:600;color:' . esc_attr( $data['color'] ) . ';">'
                 . esc_html( $data['label'] ) . '</span>';
            break;

        case 'ticket_email':
            echo esc_html( get_post_meta( $post_id, '_ticket_email', true ) );
            break;
    }
}, 10, 2 );

// ─── Admin : filtres + tri par défaut ────────────────────────────────────────

add_action( 'restrict_manage_posts', function ( $post_type ) {
    if ( $post_type !== 'support_ticket' ) return;

    $sel_status = sanitize_text_field( wp_unslash( $_GET['filter_status']   ?? '' ) );
    $sel_prio   = sanitize_text_field( wp_unslash( $_GET['filter_priority'] ?? '' ) );
    $sel_type   = sanitize_text_field( wp_unslash( $_GET['filter_type']     ?? '' ) );

    echo '<select name="filter_status"><option value="">Tous les statuts</option>';
    foreach ( TIM_TICKET_STATUSES as $s ) {
        $sel = selected( $sel_status, $s, false );
        echo "<option value='" . esc_attr( $s ) . "' $sel>" . esc_html( TIM_TICKET_STATUS_LABELS[ $s ] ?? $s ) . '</option>';
    }
    echo '</select>';

    echo '<select name="filter_priority"><option value="">Toutes les priorités</option>';
    foreach ( TIM_TICKET_PRIORITIES as $p ) {
        $sel = selected( $sel_prio, $p, false );
        echo "<option value='" . esc_attr( $p ) . "' $sel>" . esc_html( TIM_TICKET_PRIORITY_DATA[ $p ]['label'] ) . '</option>';
    }
    echo '</select>';

    echo '<select name="filter_type"><option value="">Tous les types</option>';
    foreach ( TIM_TICKET_TYPES as $t ) {
        $sel = selected( $sel_type, $t, false );
        echo "<option value='" . esc_attr( $t ) . "' $sel>" . esc_html( TIM_TICKET_TYPE_LABELS[ $t ] ?? $t ) . '</option>';
    }
    echo '</select>';
} );

add_action( 'pre_get_posts', function ( $query ) {
    if ( ! is_admin() || ! $query->is_main_query() ) return;
    if ( ( $query->get( 'post_type' ) ?? '' ) !== 'support_ticket' ) return;

    // Filtres
    $meta_query = [ 'relation' => 'AND' ];
    foreach ( [
        'filter_status'   => '_ticket_status',
        'filter_priority' => '_ticket_priority',
        'filter_type'     => '_ticket_type',
    ] as $param => $meta_key ) {
        if ( ! empty( $_GET[ $param ] ) ) {
            $meta_query[] = [
                'key'   => $meta_key,
                'value' => sanitize_text_field( wp_unslash( $_GET[ $param ] ) ),
            ];
        }
    }
    if ( count( $meta_query ) > 1 ) {
        $query->set( 'meta_query', $meta_query );
    }

    // Tri par colonne
    $orderby = $query->get( 'orderby' );
    if ( $orderby === 'ticket_priority' ) {
        $query->set( 'meta_key', '_ticket_priority_weight' );
        $query->set( 'orderby',  'meta_value_num' );
    } elseif ( $orderby === 'ticket_status' ) {
        $query->set( 'meta_key', '_ticket_status' );
        $query->set( 'orderby',  'meta_value' );
    } elseif ( $orderby === 'ticket_number' ) {
        $query->set( 'meta_key', '_ticket_number' );
        $query->set( 'orderby',  'meta_value_num' );
    } elseif ( ! $orderby ) {
        // Tri par défaut : urgents d'abord, puis par date décroissante.
        $query->set( 'meta_key', '_ticket_priority_weight' );
        $query->set( 'orderby',  [ 'meta_value_num' => 'ASC', 'date' => 'DESC' ] );
    }
} );

// ─── Admin : Quick Edit (modification en ligne) ──────────────────────────────

add_action( 'quick_edit_custom_box', function ( $col, $post_type ) {
    if ( $post_type !== 'support_ticket' ) return;
    if ( $col !== 'ticket_priority' ) return; // un seul rendu pour tout le bloc

    wp_nonce_field( 'tim_quick_edit', 'tim_quick_edit_nonce' );
    ?>
    <fieldset class="inline-edit-col-right">
      <div class="inline-edit-col">
        <label>
          <span class="title">Priorité</span>
          <select name="tim_priority">
            <?php foreach ( TIM_TICKET_PRIORITIES as $p ) : ?>
              <option value="<?php echo esc_attr( $p ); ?>"><?php echo esc_html( TIM_TICKET_PRIORITY_DATA[ $p ]['label'] ); ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label>
          <span class="title">Statut</span>
          <select name="tim_status">
            <?php foreach ( TIM_TICKET_STATUSES as $s ) : ?>
              <option value="<?php echo esc_attr( $s ); ?>"><?php echo esc_html( TIM_TICKET_STATUS_LABELS[ $s ] ?? $s ); ?></option>
            <?php endforeach; ?>
          </select>
        </label>
      </div>
    </fieldset>
    <?php
}, 10, 2 );

// JS : pré-sélectionne les valeurs courantes au clic sur "Modification rapide".
add_action( 'admin_footer-edit.php', function () {
    $screen = get_current_screen();
    if ( ! $screen || $screen->post_type !== 'support_ticket' ) return;
    ?>
    <script>
    (function ($) {
        if ( typeof inlineEditPost === 'undefined' ) return;
        var origEdit = inlineEditPost.edit;
        inlineEditPost.edit = function ( id ) {
            origEdit.apply( this, arguments );
            var postId = 0;
            if ( typeof id === 'object' ) postId = parseInt( this.getId( id ) );
            if ( ! postId ) return;
            var $row    = $( '#post-' + postId );
            var status  = $row.find( '.ticket_status_value' ).data( 'value' );
            var prio    = $row.find( '.ticket_priority_value' ).data( 'value' );
            var $editor = $( '.inline-edit-row' );
            if ( status ) $editor.find( 'select[name="tim_status"]' ).val( status );
            if ( prio )   $editor.find( 'select[name="tim_priority"]' ).val( prio );
        };
    })( jQuery );
    </script>
    <?php
} );

// Sauvegarde du Quick Edit.
add_action( 'save_post_support_ticket', function ( $post_id ) {
    if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) return;
    if ( ! current_user_can( 'edit_post', $post_id ) ) return;

    // Nonce de Quick Edit OU nonce de la méta-box (deux chemins de sauvegarde).
    $is_quick = isset( $_POST['tim_quick_edit_nonce'] ) &&
                wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['tim_quick_edit_nonce'] ) ), 'tim_quick_edit' );

    if ( ! $is_quick ) return;

    if ( isset( $_POST['tim_status'] ) ) {
        $status = sanitize_text_field( wp_unslash( $_POST['tim_status'] ) );
        _tim_set_ticket_status( $post_id, $status );
    }
    if ( isset( $_POST['tim_priority'] ) ) {
        $priority = sanitize_text_field( wp_unslash( $_POST['tim_priority'] ) );
        if ( in_array( $priority, TIM_TICKET_PRIORITIES, true ) ) {
            _tim_set_ticket_priority( $post_id, $priority );
        }
    }
}, 10 );

// ─── Admin : méta-box infos + statut ─────────────────────────────────────────

add_action( 'add_meta_boxes', function () {
    add_meta_box(
        'tim_ticket_meta',
        'Détails du ticket',
        '_tim_ticket_render_meta_box',
        'support_ticket',
        'side',
        'high'
    );
} );

function _tim_ticket_render_meta_box( WP_Post $post ): void {
    wp_nonce_field( 'tim_ticket_meta', 'tim_ticket_nonce' );
    $status   = get_post_meta( $post->ID, '_ticket_status',   true ) ?: 'new';
    $priority = get_post_meta( $post->ID, '_ticket_priority', true ) ?: 'normal';
    $type     = get_post_meta( $post->ID, '_ticket_type',     true );
    $email    = get_post_meta( $post->ID, '_ticket_email',    true );
    $name     = get_post_meta( $post->ID, '_ticket_name',     true );
    $url      = get_post_meta( $post->ID, '_ticket_url',      true );
    $service  = get_post_meta( $post->ID, '_ticket_service',  true );
    $ip       = get_post_meta( $post->ID, '_ticket_ip',       true );

    $type_label = TIM_TICKET_TYPE_LABELS[ $type ] ?? $type;

    echo '<p><strong>Type :</strong><br>' . esc_html( $type_label ) . '</p>';
    echo '<p><strong>Auteur :</strong><br>' . esc_html( ( $name ?: 'Anonyme' ) ) . '<br>';
    echo '<a href="mailto:' . esc_attr( $email ) . '">' . esc_html( $email ) . '</a></p>';
    if ( $url ) {
        echo '<p><strong>Page concernée :</strong><br><a href="' . esc_url( $url ) . '" target="_blank" rel="noopener">'
             . esc_html( wp_parse_url( $url, PHP_URL_PATH ) ?: $url ) . '</a></p>';
    }
    if ( $service ) {
        echo '<p><strong>Service concerné :</strong><br>' . esc_html( TIM_TICKET_SERVICE_LABELS[ $service ] ?? $service ) . '</p>';
    }
    if ( $ip ) {
        echo '<p style="font-size:11px;color:#888"><strong>IP :</strong> ' . esc_html( $ip ) . '</p>';
    }

    // Captures d'écran — affiche soit les miniatures, soit la trace de purge,
    // soit (planifié) la date prévue de suppression auto.
    $attachments = get_post_meta( $post->ID, '_ticket_attachments', true );
    $purged_at   = (int) get_post_meta( $post->ID, '_ticket_attachments_purged_at', true );
    $purged_n    = (int) get_post_meta( $post->ID, '_ticket_attachments_purged_count', true );

    if ( is_array( $attachments ) && ! empty( $attachments ) ) {
        echo '<p><strong>Captures d\'écran :</strong></p>';
        echo '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">';
        foreach ( $attachments as $att_id ) {
            $thumb = wp_get_attachment_image_url( (int) $att_id, 'thumbnail' );
            $full  = wp_get_attachment_url( (int) $att_id );
            if ( $thumb && $full ) {
                echo '<a href="' . esc_url( $full ) . '" target="_blank" rel="noopener" style="display:block;">';
                echo '<img src="' . esc_url( $thumb ) . '" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:1px solid #ddd;" />';
                echo '</a>';
            }
        }
        echo '</div>';

        // Si une purge est planifiée, on l'indique
        $next = wp_next_scheduled( 'tim_purge_ticket_attachments', [ $post->ID ] );
        if ( $next ) {
            echo '<p style="font-size:11px;color:#92400e;margin:0 0 12px;">⏳ Suppression auto prévue le ' .
                 esc_html( wp_date( 'd/m/Y H:i', $next ) ) . '</p>';
        }
    } elseif ( $purged_at > 0 ) {
        echo '<p style="background:#f3f4f6;border-left:3px solid #6b7280;padding:8px 10px;margin-bottom:12px;font-size:12px;color:#6b7280;">';
        echo '🗑️ ' . esc_html( sprintf(
            '%d capture(s) supprimée(s) automatiquement le %s.',
            $purged_n,
            wp_date( 'd/m/Y', $purged_at )
        ) );
        echo '</p>';
    }

    echo '<p><label for="tim_meta_priority"><strong>Priorité :</strong></label><br>';
    echo '<select name="tim_meta_priority" id="tim_meta_priority" style="width:100%;">';
    foreach ( TIM_TICKET_PRIORITIES as $p ) {
        $sel  = selected( $priority, $p, false );
        $data = TIM_TICKET_PRIORITY_DATA[ $p ];
        echo "<option value='" . esc_attr( $p ) . "' $sel>" . esc_html( $data['label'] ) . '</option>';
    }
    echo '</select></p>';

    echo '<p><label for="tim_meta_status"><strong>Statut :</strong></label><br>';
    echo '<select name="tim_meta_status" id="tim_meta_status" style="width:100%;">';
    foreach ( TIM_TICKET_STATUSES as $s ) {
        $sel = selected( $status, $s, false );
        echo "<option value='" . esc_attr( $s ) . "' $sel>" . esc_html( TIM_TICKET_STATUS_LABELS[ $s ] ?? $s ) . '</option>';
    }
    echo '</select></p>';
}

// Sauvegarde de la méta-box (édition complète) — distincte du Quick Edit.
add_action( 'save_post_support_ticket', function ( $post_id ) {
    if ( ! isset( $_POST['tim_ticket_nonce'] ) ) return;
    if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['tim_ticket_nonce'] ) ), 'tim_ticket_meta' ) ) return;
    if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) return;
    if ( ! current_user_can( 'edit_post', $post_id ) ) return;

    if ( isset( $_POST['tim_meta_status'] ) ) {
        $status = sanitize_text_field( wp_unslash( $_POST['tim_meta_status'] ) );
        _tim_set_ticket_status( $post_id, $status );
    }
    if ( isset( $_POST['tim_meta_priority'] ) ) {
        $priority = sanitize_text_field( wp_unslash( $_POST['tim_meta_priority'] ) );
        if ( in_array( $priority, TIM_TICKET_PRIORITIES, true ) ) {
            _tim_set_ticket_priority( $post_id, $priority );
        }
    }
}, 10 );

// ─── Admin : onglets de filtre par statut (au-dessus de la liste) ────────────

add_filter( 'views_edit-support_ticket', function ( $views ) {
    global $wpdb;

    // Compte les tickets pour chaque statut en une seule requête.
    $rows = $wpdb->get_results(
        "SELECT pm.meta_value AS status, COUNT(*) AS cnt
         FROM {$wpdb->postmeta} pm
         INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
         WHERE pm.meta_key = '_ticket_status'
           AND p.post_type = 'support_ticket'
           AND p.post_status = 'publish'
         GROUP BY pm.meta_value"
    );
    $counts = [];
    foreach ( $rows as $r ) {
        $counts[ $r->status ] = (int) $r->cnt;
    }

    $current = sanitize_text_field( wp_unslash( $_GET['filter_status'] ?? '' ) );

    foreach ( TIM_TICKET_STATUSES as $s ) {
        $count = $counts[ $s ] ?? 0;
        $url   = add_query_arg( [
            'post_type'     => 'support_ticket',
            'filter_status' => $s,
        ], admin_url( 'edit.php' ) );
        $is_current = ( $current === $s );
        $color      = TIM_TICKET_STATUS_COLORS[ $s ] ?? '#6b7280';
        $views[ 'tim_' . $s ] = sprintf(
            '<a href="%s"%s style="border-left:3px solid %s;padding-left:6px;">%s <span class="count">(%d)</span></a>',
            esc_url( $url ),
            $is_current ? ' class="current"' : '',
            esc_attr( $color ),
            esc_html( TIM_TICKET_STATUS_LABELS[ $s ] ?? $s ),
            $count
        );
    }
    return $views;
} );

// ─── Admin : bulk actions (changement statut / priorité en masse) ────────────

add_filter( 'bulk_actions-edit-support_ticket', function ( $actions ) {
    $tim_actions = [];
    foreach ( TIM_TICKET_STATUSES as $s ) {
        $tim_actions[ 'tim_status_' . $s ] = 'Statut → ' . ( TIM_TICKET_STATUS_LABELS[ $s ] ?? $s );
    }
    foreach ( TIM_TICKET_PRIORITIES as $p ) {
        $tim_actions[ 'tim_prio_' . $p ] = 'Priorité → ' . TIM_TICKET_PRIORITY_DATA[ $p ]['label'];
    }
    // Nos actions en haut, on garde Trash & co après.
    return array_merge( $tim_actions, $actions );
} );

add_filter( 'handle_bulk_actions-edit-support_ticket', function ( $redirect, $action, $ids ) {
    if ( ! current_user_can( 'edit_posts' ) || empty( $ids ) ) return $redirect;

    if ( strpos( $action, 'tim_status_' ) === 0 ) {
        $status = substr( $action, strlen( 'tim_status_' ) );
        if ( in_array( $status, TIM_TICKET_STATUSES, true ) ) {
            foreach ( $ids as $id ) {
                _tim_set_ticket_status( (int) $id, $status );
            }
            $redirect = add_query_arg( [
                'tim_bulk_kind'  => 'status',
                'tim_bulk_value' => $status,
                'tim_bulk_count' => count( $ids ),
            ], $redirect );
        }
    } elseif ( strpos( $action, 'tim_prio_' ) === 0 ) {
        $priority = substr( $action, strlen( 'tim_prio_' ) );
        if ( in_array( $priority, TIM_TICKET_PRIORITIES, true ) ) {
            foreach ( $ids as $id ) {
                _tim_set_ticket_priority( (int) $id, $priority );
            }
            $redirect = add_query_arg( [
                'tim_bulk_kind'  => 'priority',
                'tim_bulk_value' => $priority,
                'tim_bulk_count' => count( $ids ),
            ], $redirect );
        }
    }
    return $redirect;
}, 10, 3 );

add_action( 'admin_notices', function () {
    $screen = get_current_screen();
    if ( ! $screen || $screen->post_type !== 'support_ticket' ) return;

    $count = (int) ( $_GET['tim_bulk_count'] ?? 0 );
    $kind  = sanitize_text_field( wp_unslash( $_GET['tim_bulk_kind']  ?? '' ) );
    $value = sanitize_text_field( wp_unslash( $_GET['tim_bulk_value'] ?? '' ) );
    if ( ! $count || ! $kind ) return;

    $label = '';
    if ( $kind === 'status' ) {
        $label = TIM_TICKET_STATUS_LABELS[ $value ] ?? $value;
        $msg   = sprintf( '%d ticket(s) marqué(s) « %s ».', $count, $label );
    } elseif ( $kind === 'priority' ) {
        $label = TIM_TICKET_PRIORITY_DATA[ $value ]['label'] ?? $value;
        $msg   = sprintf( '%d ticket(s) → priorité « %s ».', $count, $label );
    } else {
        return;
    }

    echo '<div class="updated notice is-dismissible"><p>' . esc_html( $msg ) . '</p></div>';
} );

// ─── Admin : notes internes (méta-box dédiée) ────────────────────────────────

add_action( 'add_meta_boxes', function () {
    add_meta_box(
        'tim_ticket_notes',
        '📝 Notes internes (équipe)',
        '_tim_ticket_render_notes_box',
        'support_ticket',
        'normal',
        'default'
    );
} );

function _tim_ticket_render_notes_box( WP_Post $post ): void {
    wp_nonce_field( 'tim_ticket_notes', 'tim_ticket_notes_nonce' );
    $notes = get_post_meta( $post->ID, '_ticket_notes', true );
    echo '<textarea name="tim_notes" rows="6" style="width:100%;font-family:inherit;background:#fef9c3;border:1px solid #facc15;padding:10px;border-radius:4px;line-height:1.5;" placeholder="Annotations équipe, étapes de résolution, pistes investiguées, contexte interne…">'
         . esc_textarea( $notes ?: '' )
         . '</textarea>';
    echo '<p class="description" style="margin-top:6px;color:#92400e;">⚠️ Visible uniquement par l\'équipe support. N\'apparaît jamais dans les emails au client.</p>';
}

add_action( 'save_post_support_ticket', function ( $post_id ) {
    if ( ! isset( $_POST['tim_ticket_notes_nonce'] ) ) return;
    if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['tim_ticket_notes_nonce'] ) ), 'tim_ticket_notes' ) ) return;
    if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) return;
    if ( ! current_user_can( 'edit_post', $post_id ) ) return;

    if ( isset( $_POST['tim_notes'] ) ) {
        $notes = sanitize_textarea_field( wp_unslash( $_POST['tim_notes'] ) );
        update_post_meta( $post_id, '_ticket_notes', $notes );
    }
}, 10 );

// ─── Admin : bordure colorée à gauche selon la priorité ──────────────────────

add_filter( 'post_class', function ( $classes, $class, $post_id ) {
    if ( get_post_type( $post_id ) !== 'support_ticket' ) return $classes;
    $prio = get_post_meta( $post_id, '_ticket_priority', true ) ?: 'normal';
    if ( in_array( $prio, TIM_TICKET_PRIORITIES, true ) ) {
        $classes[] = 'tim-prio-' . $prio;
    }
    return $classes;
}, 10, 3 );

add_action( 'admin_head-edit.php', function () {
    $screen = get_current_screen();
    if ( ! $screen || $screen->post_type !== 'support_ticket' ) return;
    ?>
    <style>
    /* Bordure colorée à gauche de chaque ligne, suivant la priorité.
       Appliquée via box-shadow inset sur la cellule checkbox (la 1ʳᵉ visible). */
    .wp-list-table tr.tim-prio-urgent th.check-column { box-shadow: inset 4px 0 0 #dc2626; }
    .wp-list-table tr.tim-prio-high   th.check-column { box-shadow: inset 4px 0 0 #ea580c; }
    .wp-list-table tr.tim-prio-normal th.check-column { box-shadow: inset 4px 0 0 #ca8a04; }
    .wp-list-table tr.tim-prio-low    th.check-column { box-shadow: inset 4px 0 0 #9ca3af; }
    /* Espace pour ne pas que le contenu colle à la barre */
    .wp-list-table tr[class*="tim-prio-"] th.check-column { padding-left: 12px !important; }
    </style>
    <?php
} );
