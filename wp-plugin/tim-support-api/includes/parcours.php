<?php
/**
 * Parcours d'apprentissage — CPT + ACF + REST API.
 *
 * Un parcours = une liste ordonnée de features (réutilise la doc existante
 * comme contenu pédagogique). Création depuis WP admin : titre + intro
 * courte + sélection drag-and-drop de features. Zéro contenu à rédiger.
 *
 * Front : /parcours (liste) + /parcours/{slug}?etape=N (mode tuto guidé).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Profils utilisateurs cibles pour les parcours.
// Modifier ici = répercussion automatique sur l'admin + le front.
const TIM_PARCOURS_PROFILS = [
    'admin'         => '👔 Administrateur',
    'conducteur'    => '📋 Conducteur de travaux',
    'chef-chantier' => '🦺 Chef de chantier',
    'compagnon'     => '🛠️ Compagnon',
];

// ─── CPT ─────────────────────────────────────────────────────────────────────

add_action( 'init', function () {
    register_post_type( 'parcours', [
        'labels' => [
            'name'               => 'Parcours',
            'singular_name'      => 'Parcours',
            'menu_name'          => 'Parcours',
            'add_new'            => 'Ajouter',
            'add_new_item'       => 'Ajouter un parcours',
            'edit_item'          => 'Modifier le parcours',
            'view_item'          => 'Voir le parcours',
            'search_items'       => 'Rechercher un parcours',
            'not_found'          => 'Aucun parcours trouvé.',
            'not_found_in_trash' => 'Aucun parcours dans la corbeille.',
            'all_items'          => 'Tous les parcours',
        ],
        'public'          => false,
        'show_ui'         => true,
        'show_in_menu'    => true,
        'menu_icon'       => 'dashicons-welcome-learn-more',
        'menu_position'   => 26,
        // `page-attributes` ajoute le champ "Ordre" (menu_order) à droite
        // du formulaire d'édition → permet de classer les parcours librement.
        'supports'        => [ 'title', 'page-attributes' ],
        'show_in_rest'    => false,
        'capability_type' => 'post',
        'has_archive'     => false,
        'rewrite'         => false,
    ] );
} );

// ─── ACF — champs auto-enregistrés ───────────────────────────────────────────
// Création depuis admin : on ne configure rien, tout est défini en code ici.

add_action( 'acf/init', function () {
    if ( ! function_exists( 'acf_add_local_field_group' ) ) return;

    acf_add_local_field_group( [
        'key'    => 'group_tim_parcours',
        'title'  => 'Configuration du parcours',
        'fields' => [
            [
                'key'           => 'field_tim_parcours_profil',
                'label'         => 'Profil cible',
                'name'          => 'profil',
                'type'          => 'select',
                'choices'       => TIM_PARCOURS_PROFILS,
                'allow_null'    => 1,
                'ui'            => 1,
                'instructions'  => 'À quel profil d\'utilisateur s\'adresse ce parcours ? (Utilisé pour grouper les parcours sur la page /parcours.)',
            ],
            [
                'key'           => 'field_tim_parcours_intro',
                'label'         => 'Introduction',
                'name'          => 'intro',
                'type'          => 'textarea',
                'rows'          => 3,
                'instructions'  => 'Une phrase courte qui présente l\'objectif du parcours (ex: "Maîtrisez les bases pour démarrer en tant que chef de chantier.").',
            ],
            [
                'key'           => 'field_tim_parcours_features',
                'label'         => 'Étapes du parcours',
                'name'          => 'features',
                'type'          => 'relationship',
                'post_type'     => [ 'feature' ],
                // Garder uniquement la barre de recherche ; pas de filtre par
                // taxonomie (qui exigerait un format "taxo:term_slug" et
                // restreindrait la requête).
                'filters'       => [ 'search' ],
                'return_format' => 'id',
                'min'           => 1,
                'instructions'  => 'Recherchez et sélectionnez les fonctionnalités à enchaîner. Glissez-déposez pour définir l\'ordre des étapes.',
                'required'      => 1,
            ],
        ],
        'location' => [
            [
                [ 'param' => 'post_type', 'operator' => '==', 'value' => 'parcours' ],
            ],
        ],
        'menu_order' => 0,
        'position'   => 'normal',
        'style'      => 'default',
        'label_placement' => 'top',
    ] );
} );

// ─── ACF : personnalise l'affichage du champ relationship ────────────────────
// Montre le titre ACF (= titre affiché sur le site) au lieu du post_title brut,
// pour que l'admin retrouve les features avec le même nom que sur le front.

add_filter( 'acf/fields/relationship/result/key=field_tim_parcours_features',
    function ( $title, $post, $field, $post_id ) {
        if ( $post && $post->post_type === 'feature' && function_exists( 'get_field' ) ) {
            $acf_title = (string) get_field( 'title_feature', $post->ID );
            if ( $acf_title !== '' ) {
                return $acf_title;
            }
        }
        return $title;
    },
    10, 4
);

// Augmente le nombre de résultats par "page" du champ (par défaut ACF en
// charge ~25 ; on monte à 200 pour que toute la liste soit immédiatement
// accessible sans avoir à scroller).
add_filter( 'acf/fields/relationship/query/key=field_tim_parcours_features',
    function ( $args ) {
        $args['posts_per_page'] = 200;
        $args['orderby']        = 'title';
        $args['order']          = 'ASC';
        return $args;
    },
    10, 1
);

// ─── Admin : colonnes Profil + Ordre dans la liste des parcours ──────────────

add_filter( 'manage_parcours_posts_columns', function ( $cols ) {
    return [
        'cb'              => $cols['cb'] ?? '',
        'parcours_order'  => 'Ordre',
        'title'           => 'Titre',
        'parcours_profil' => 'Profil cible',
        'date'            => 'Modifié le',
    ];
} );

add_filter( 'manage_edit-parcours_sortable_columns', function ( $cols ) {
    $cols['parcours_order']  = 'menu_order';
    $cols['parcours_profil'] = 'parcours_profil';
    return $cols;
} );

add_action( 'manage_parcours_posts_custom_column', function ( $col, $post_id ) {
    if ( $col === 'parcours_order' ) {
        $order = (int) get_post_field( 'menu_order', $post_id );
        echo '<strong style="font-family:monospace;color:#475569;">' . esc_html( $order ) . '</strong>';
    } elseif ( $col === 'parcours_profil' ) {
        $profil = get_post_meta( $post_id, 'profil', true );
        if ( $profil && isset( TIM_PARCOURS_PROFILS[ $profil ] ) ) {
            echo esc_html( TIM_PARCOURS_PROFILS[ $profil ] );
        } else {
            echo '<span style="color:#94a3b8">—</span>';
        }
    }
}, 10, 2 );

// Tri par défaut de la liste admin : menu_order ASC, comme côté front.
add_action( 'pre_get_posts', function ( $query ) {
    if ( ! is_admin() || ! $query->is_main_query() ) return;
    if ( ( $query->get( 'post_type' ) ?? '' ) !== 'parcours' ) return;
    if ( ! $query->get( 'orderby' ) ) {
        $query->set( 'orderby', 'menu_order' );
        $query->set( 'order',   'ASC' );
    }
} );

// ─── Helper : retourne les IDs ordonnés des features d'un parcours ──────────

function _tim_parcours_step_ids( int $post_id ): array {
    $ids = function_exists( 'get_field' ) ? get_field( 'features', $post_id ) : [];
    if ( ! is_array( $ids ) ) return [];
    // ACF peut retourner des IDs (int) ou des WP_Post — on normalise
    return array_values( array_filter( array_map( function ( $f ) {
        return is_object( $f ) ? (int) $f->ID : (int) $f;
    }, $ids ) ) );
}

// ─── REST API ────────────────────────────────────────────────────────────────
//
// GET /tim-support/v1/parcours          → liste tous les parcours
// GET /tim-support/v1/parcours/{slug}   → fiche complète avec features embedded

add_action( 'rest_api_init', function () {

    // Liste — triée par menu_order croissant puis titre (alpha) en fallback.
    register_rest_route( 'tim-support/v1', '/parcours', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function () {
            $posts = get_posts( [
                'post_type'      => 'parcours',
                'post_status'    => 'publish',
                'posts_per_page' => 50,
                'orderby'        => [ 'menu_order' => 'ASC', 'title' => 'ASC' ],
            ] );

            return array_map( function ( $p ) {
                $step_ids = _tim_parcours_step_ids( $p->ID );
                return [
                    'id'         => $p->ID,
                    'slug'       => $p->post_name,
                    'title'      => $p->post_title,
                    'intro'      => function_exists( 'get_field' ) ? (string) get_field( 'intro', $p->ID ) : '',
                    'profil'     => function_exists( 'get_field' ) ? (string) get_field( 'profil', $p->ID ) : '',
                    'order'      => (int) $p->menu_order,
                    'step_count' => count( $step_ids ),
                    'modified'   => $p->post_modified,
                ];
            }, $posts );
        },
    ] );

    // Fiche complète — embed les features pour éviter N requêtes côté front
    register_rest_route( 'tim-support/v1', '/parcours/(?P<slug>[a-z0-9-]+)', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'args'                => [ 'slug' => [ 'required' => true, 'type' => 'string' ] ],
        'callback'            => function ( WP_REST_Request $req ) {
            $posts = get_posts( [
                'post_type'   => 'parcours',
                'post_status' => 'publish',
                'name'        => sanitize_title( $req->get_param( 'slug' ) ),
            ] );

            if ( empty( $posts ) ) {
                return new WP_Error( 'not_found', 'Parcours introuvable.', [ 'status' => 404 ] );
            }

            $p        = $posts[0];
            $step_ids = _tim_parcours_step_ids( $p->ID );

            // Fetch ordonné des features — on garde l'ordre exact du repeater
            $steps = [];
            foreach ( $step_ids as $fid ) {
                $feature_post = get_post( $fid );
                if ( ! $feature_post || $feature_post->post_type !== 'feature' || $feature_post->post_status !== 'publish' ) continue;
                $steps[] = _tim_format_feature( $feature_post, true );
            }

            return rest_ensure_response( [
                'id'       => $p->ID,
                'slug'     => $p->post_name,
                'title'    => $p->post_title,
                'intro'    => function_exists( 'get_field' ) ? (string) get_field( 'intro', $p->ID ) : '',
                'profil'   => function_exists( 'get_field' ) ? (string) get_field( 'profil', $p->ID ) : '',
                'order'    => (int) $p->menu_order,
                'steps'    => $steps,
                'modified' => $p->post_modified,
            ] );
        },
    ] );

} );
