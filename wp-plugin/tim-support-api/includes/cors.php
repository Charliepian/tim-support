<?php
/**
 * CORS — autorise les requêtes depuis le frontend Next.js
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'TIM_SUPPORT_ALLOWED_ORIGINS', [
    'https://support.tim-management.co',
    'https://tim-support.vercel.app',
] );

add_action( 'rest_api_init', function () {
    remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );

    add_filter( 'rest_pre_serve_request', function ( $served, $result, $request ) {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        $is_allowed = in_array( $origin, TIM_SUPPORT_ALLOWED_ORIGINS, true )
            || preg_match( '/^https:\/\/tim-support-[a-z0-9\-]+-charliepians-projects\.vercel\.app$/', $origin );

        if ( $is_allowed ) {
            header( 'Access-Control-Allow-Origin: ' . $origin );
            header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS' );
            header( 'Access-Control-Allow-Credentials: true' );
            header( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce' );
            header( 'Vary: Origin' );
        }

        if ( 'OPTIONS' === $_SERVER['REQUEST_METHOD'] ) {
            status_header( 204 );
            exit;
        }

        return $served;
    }, 10, 3 );
}, 15 );
