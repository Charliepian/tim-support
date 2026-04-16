<?php
/**
 * ACF — Exposition des champs du CPT "feature" via REST API
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Retourner les images comme objets complets (pas juste des IDs)
add_filter( 'acf/settings/rest_api_format', function () {
    return 'standard';
} );

// Expose les champs ACF sur le CPT "feature"
add_action( 'rest_api_init', function () {
    register_rest_field( 'feature', 'acf', [
        'get_callback' => function ( $post ) {
            if ( ! function_exists( 'get_fields' ) ) return new stdClass();
            $fields = get_fields( $post['id'] );
            return is_array( $fields ) ? $fields : new stdClass();
        },
        'schema' => [
            'type'        => 'object',
            'description' => 'Champs ACF de la fonctionnalité',
        ],
    ] );
} );

// Expose les compteurs de feedback en lecture
add_action( 'rest_api_init', function () {
    register_rest_field( 'feature', 'feedback', [
        'get_callback' => function ( $post ) {
            return [
                'helpful'     => (int) get_post_meta( $post['id'], '_feedback_helpful',     true ),
                'not_helpful' => (int) get_post_meta( $post['id'], '_feedback_not_helpful', true ),
            ];
        },
        'schema' => [
            'type'       => 'object',
            'properties' => [
                'helpful'     => [ 'type' => 'integer' ],
                'not_helpful' => [ 'type' => 'integer' ],
            ],
        ],
    ] );
} );
