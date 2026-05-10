<?php
/**
 * Pages d'administration du plugin TIM Support API.
 *
 * Pour l'instant : un outil dans Outils → TIM Support pour reconstruire
 * l'index de recherche H2/H3 sur l'ensemble des features (utile après
 * une première installation ou si on suspecte une désynchro).
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'admin_menu', function () {
    add_management_page(
        'TIM Support',                    // <title>
        'TIM Support',                    // libellé du menu
        'manage_options',                 // capability requise
        'tim-support-tools',              // slug
        '_tim_render_tools_page'          // callback
    );
} );

function _tim_render_tools_page(): void {
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( 'Accès refusé.' );
    }

    $message = '';

    if (
        isset( $_POST['tim_action'] ) &&
        $_POST['tim_action'] === 'rebuild_search_index' &&
        check_admin_referer( 'tim_rebuild_search_index' )
    ) {
        $start = microtime( true );
        $ids = get_posts( [
            'post_type'      => 'feature',
            'post_status'    => 'any',
            'posts_per_page' => -1,
            'fields'         => 'ids',
        ] );

        $count = 0;
        foreach ( $ids as $id ) {
            _tim_refresh_search_headings( (int) $id );
            $count++;
        }

        $elapsed = round( microtime( true ) - $start, 2 );
        $message = sprintf(
            'Index reconstruit pour %d feature%s en %s s.',
            $count,
            $count > 1 ? 's' : '',
            number_format_i18n( $elapsed, 2 )
        );
    }

    ?>
    <div class="wrap">
        <h1>TIM Support — Outils</h1>

        <?php if ( $message ) : ?>
            <div class="notice notice-success is-dismissible">
                <p><strong><?php echo esc_html( $message ); ?></strong></p>
            </div>
        <?php endif; ?>

        <div class="card" style="max-width: 720px; margin-top: 1em;">
            <h2 class="title">Index de recherche H2/H3</h2>
            <p>
                Reconstruit l'index <code>_search_h2</code> / <code>_search_h3</code> de
                toutes les features publiées et non publiées. À lancer une fois après
                l'installation du plugin, ou si tu suspectes une désynchronisation.
            </p>
            <p>
                <em>L'index est mis à jour automatiquement à chaque sauvegarde — cet outil
                n'est utile qu'en cas de backfill manuel.</em>
            </p>
            <form method="post">
                <?php wp_nonce_field( 'tim_rebuild_search_index' ); ?>
                <input type="hidden" name="tim_action" value="rebuild_search_index">
                <p>
                    <button type="submit" class="button button-primary">
                        Reconstruire l'index
                    </button>
                </p>
            </form>
        </div>
    </div>
    <?php
}
