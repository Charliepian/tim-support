<?php
/**
 * Revalidation Next.js — déclenche un webhook à chaque sauvegarde de feature.
 * Envoie un POST à NEXT_REVALIDATE_URL avec le slug du post et un secret.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'save_post_feature', function ( int $post_id, WP_Post $post ) {

    // Ignorer les révisions et les auto-saves
    if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) return;

    $next_url = defined( 'NEXT_REVALIDATE_URL' )
        ? NEXT_REVALIDATE_URL
        : get_option( 'next_revalidate_url', '' );

    if ( empty( $next_url ) ) return;

    $secret = defined( 'NEXT_REVALIDATE_SECRET' )
        ? NEXT_REVALIDATE_SECRET
        : get_option( 'next_revalidate_secret', '' );

    wp_remote_post( trailingslashit( $next_url ) . 'api/revalidate', [
        'timeout'     => 10,
        'headers'     => [ 'Content-Type' => 'application/json' ],
        'body'        => wp_json_encode( [
            'secret' => $secret,
            'slug'   => $post->post_name,
        ] ),
        'blocking'    => false, // ne bloque pas la sauvegarde WP
    ] );

}, 10, 2 );
