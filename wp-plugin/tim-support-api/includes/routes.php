<?php
/**
 * Routes REST API — /wp-json/tim-support/v1/
 *
 * GET  /features                  → liste (filtres: platform, category, per_page)
 * GET  /features/{slug}           → fiche complète
 * GET  /feature-categories        → liste (filtre: platform)
 * GET  /platforms                 → liste des plateformes
 * POST /feedback                  → soumettre un retour utilisateur
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'rest_api_init', function () {

    // ── Liste des features ────────────────────────────────────────────────────
    register_rest_route( 'tim-support/v1', '/features', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function ( WP_REST_Request $req ) {

            $tax_query = [ 'relation' => 'AND' ];

            if ( $platform = $req->get_param( 'platform' ) ) {
                $tax_query[] = [
                    'taxonomy' => 'platform',
                    'field'    => 'slug',
                    'terms'    => sanitize_text_field( $platform ),
                ];
            }

            if ( $category = $req->get_param( 'category' ) ) {
                $tax_query[] = [
                    'taxonomy' => 'feature_category',
                    'field'    => 'slug',
                    'terms'    => sanitize_text_field( $category ),
                ];
            }

            $posts = get_posts( [
                'post_type'      => 'feature',
                'post_status'    => 'publish',
                'posts_per_page' => absint( $req->get_param( 'per_page' ) ?: 200 ),
                'orderby'        => 'title',
                'order'          => 'ASC',
                'tax_query'      => count( $tax_query ) > 1 ? $tax_query : [],
            ] );

            return array_map( fn( $p ) => _tim_format_feature( $p, false ), $posts );
        },
    ] );

    // ── Feature par slug ──────────────────────────────────────────────────────
    register_rest_route( 'tim-support/v1', '/features/(?P<slug>[a-z0-9-]+)', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'args'                => [ 'slug' => [ 'required' => true, 'type' => 'string' ] ],
        'callback'            => function ( WP_REST_Request $req ) {
            $posts = get_posts( [
                'post_type'   => 'feature',
                'post_status' => 'publish',
                'name'        => sanitize_title( $req->get_param( 'slug' ) ),
            ] );

            if ( empty( $posts ) ) {
                return new WP_Error( 'not_found', 'Fonctionnalité introuvable.', [ 'status' => 404 ] );
            }

            return _tim_format_feature( $posts[0], true );
        },
    ] );

    // ── Catégories de features ────────────────────────────────────────────────
    register_rest_route( 'tim-support/v1', '/feature-categories', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function ( WP_REST_Request $req ) {
            $platform = sanitize_text_field( $req->get_param( 'platform' ) ?: '' );

            $terms = get_terms( [
                'taxonomy'   => 'feature_category',
                'hide_empty' => true,
                'orderby'    => 'name',
                'order'      => 'ASC',
            ] );

            if ( is_wp_error( $terms ) ) return [];

            // Filtre : ne garder que les catégories avec au moins une feature
            // sur la plateforme demandée
            if ( $platform ) {
                $terms = array_filter( $terms, function ( $term ) use ( $platform ) {
                    return ! empty( get_posts( [
                        'post_type'      => 'feature',
                        'post_status'    => 'publish',
                        'posts_per_page' => 1,
                        'fields'         => 'ids',
                        'tax_query'      => [
                            [ 'taxonomy' => 'platform',         'field' => 'slug',    'terms' => $platform       ],
                            [ 'taxonomy' => 'feature_category', 'field' => 'term_id', 'terms' => $term->term_id  ],
                        ],
                    ] ) );
                } );
            }

            return array_values( array_map( fn( $t ) => [
                'id'    => $t->term_id,
                'name'  => $t->name,
                'slug'  => $t->slug,
                'count' => (int) $t->count,
            ], $terms ) );
        },
    ] );

    // ── Plateformes ───────────────────────────────────────────────────────────
    register_rest_route( 'tim-support/v1', '/platforms', [
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function () {
            $terms = get_terms( [ 'taxonomy' => 'platform', 'hide_empty' => false ] );
            if ( is_wp_error( $terms ) ) return [];

            return array_map( fn( $t ) => [
                'id'    => $t->term_id,
                'name'  => $t->name,
                'slug'  => $t->slug,
                'count' => (int) $t->count,
            ], $terms );
        },
    ] );

    // ── Feedback ─────────────────────────────────────────────────────────────
    register_rest_route( 'tim-support/v1', '/feedback', [
        'methods'             => 'POST',
        'permission_callback' => '__return_true',
        'args'                => [
            'post_id' => [ 'required' => true,  'type' => 'integer', 'minimum' => 1 ],
            'helpful' => [ 'required' => true,  'type' => 'boolean' ],
            'comment' => [ 'required' => false, 'type' => 'string'  ],
        ],
        'callback'            => function ( WP_REST_Request $req ) {
            $post_id = absint( $req->get_param( 'post_id' ) );
            $helpful  = (bool) $req->get_param( 'helpful' );
            $comment  = sanitize_textarea_field( $req->get_param( 'comment' ) ?? '' );

            if ( 'feature' !== get_post_type( $post_id ) ) {
                return new WP_Error( 'invalid_post', 'Post invalide.', [ 'status' => 400 ] );
            }

            // Incrémenter le compteur
            $key     = $helpful ? '_feedback_helpful' : '_feedback_not_helpful';
            $current = (int) get_post_meta( $post_id, $key, true );
            update_post_meta( $post_id, $key, $current + 1 );

            // Commentaire négatif → stocké en attente de modération
            if ( ! $helpful && $comment !== '' ) {
                wp_insert_comment( [
                    'comment_post_ID'   => $post_id,
                    'comment_content'   => $comment,
                    'comment_type'      => 'feedback',
                    'comment_approved'  => 0,
                    'comment_author'    => 'Visiteur',
                    'comment_author_IP' => $_SERVER['REMOTE_ADDR'] ?? '',
                ] );
            }

            return rest_ensure_response( [ 'success' => true ] );
        },
    ] );

} );

// ── Helper interne ────────────────────────────────────────────────────────────

function _tim_format_feature( WP_Post $post, bool $full ): array {
    $acf = function_exists( 'get_fields' ) ? ( get_fields( $post->ID ) ?: [] ) : [];

    $platforms  = wp_get_post_terms( $post->ID, 'platform',         [ 'fields' => 'all' ] );
    $categories = wp_get_post_terms( $post->ID, 'feature_category', [ 'fields' => 'all' ] );

    $thumb_id  = get_post_thumbnail_id( $post->ID );
    $thumbnail = $thumb_id ? wp_get_attachment_image_url( $thumb_id, 'large' ) : null;

    $data = [
        'id'         => $post->ID,
        'slug'       => $post->post_name,
        'title'      => $post->post_title,
        'thumbnail'  => $thumbnail,
        'platforms'  => array_map( fn( $t ) => [ 'id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug ], is_array( $platforms )  ? $platforms  : [] ),
        'categories' => array_map( fn( $t ) => [ 'id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug ], is_array( $categories ) ? $categories : [] ),
        'acf'        => $acf,
        'feedback'   => [
            'helpful'     => (int) get_post_meta( $post->ID, '_feedback_helpful',     true ),
            'not_helpful' => (int) get_post_meta( $post->ID, '_feedback_not_helpful', true ),
        ],
        'modified'   => $post->post_modified,
    ];

    if ( $full ) {
        $data['content'] = apply_filters( 'the_content', $post->post_content );
    }

    return $data;
}
