<?php
/**
 * Index de recherche pré-calculé pour les features.
 *
 * Extrait les balises <h2> et <h3> contenues dans les champs riches
 * (description_doc + media_doc[].editeur) à chaque sauvegarde et stocke
 * le résultat en post meta. Cela évite de parser du HTML à chaque
 * requête API et rend la recherche front quasi instantanée.
 *
 * Meta keys :
 *   _search_h2 → array<string> (titres H2 lowercased, dédoublonnés)
 *   _search_h3 → array<string> (titres H3 lowercased, dédoublonnés)
 */

if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Extrait le texte brut des balises <hN> d'un fragment HTML.
 */
function _tim_extract_headings_by_level( string $html, int $level ): array {
    if ( $html === '' ) return [];

    $pattern = '/<h' . $level . '\b[^>]*>(.*?)<\/h' . $level . '>/is';
    if ( ! preg_match_all( $pattern, $html, $matches ) ) return [];

    $out = [];
    foreach ( $matches[1] as $raw ) {
        $text = wp_strip_all_tags( html_entity_decode( $raw, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
        $text = preg_replace( '/\s+/u', ' ', trim( $text ) );
        if ( $text === '' ) continue;
        // Casse d'origine conservée pour l'affichage front (ex: "Réduire le panneau").
        // La comparaison est faite en lowercase côté JS au moment du scoring.
        $out[] = $text;
    }
    return $out;
}

/**
 * Construit l'index H2/H3 d'une feature à partir de ses champs ACF.
 */
function _tim_build_search_headings( int $post_id ): array {
    $h2 = [];
    $h3 = [];

    if ( ! function_exists( 'get_field' ) ) {
        return [ 'h2' => [], 'h3' => [] ];
    }

    $doc = get_field( 'doc', $post_id );
    if ( ! is_array( $doc ) ) {
        return [ 'h2' => [], 'h3' => [] ];
    }

    foreach ( $doc as $section ) {
        // description_doc : HTML libre principal de la section
        $desc = $section['description_doc'] ?? '';
        if ( is_string( $desc ) && $desc !== '' ) {
            $h2 = array_merge( $h2, _tim_extract_headings_by_level( $desc, 2 ) );
            $h3 = array_merge( $h3, _tim_extract_headings_by_level( $desc, 3 ) );
        }

        // media_doc[] : on ne s'intéresse qu'aux blocs "editeur" (rich text)
        $media = $section['media_doc'] ?? [];
        if ( is_array( $media ) ) {
            foreach ( $media as $item ) {
                if ( ( $item['acf_fc_layout'] ?? '' ) !== 'editeur' ) continue;
                $html = $item['editeur'] ?? '';
                if ( ! is_string( $html ) || $html === '' ) continue;
                $h2 = array_merge( $h2, _tim_extract_headings_by_level( $html, 2 ) );
                $h3 = array_merge( $h3, _tim_extract_headings_by_level( $html, 3 ) );
            }
        }
    }

    return [
        'h2' => array_values( array_unique( $h2 ) ),
        'h3' => array_values( array_unique( $h3 ) ),
    ];
}

/**
 * Recalcule et persiste l'index pour une feature.
 */
function _tim_refresh_search_headings( int $post_id ): array {
    $headings = _tim_build_search_headings( $post_id );
    update_post_meta( $post_id, '_search_h2', $headings['h2'] );
    update_post_meta( $post_id, '_search_h3', $headings['h3'] );
    return $headings;
}

/**
 * Lit l'index avec fallback lazy : si le meta n'existe pas encore
 * (features créées avant l'installation de ce module), on le construit
 * et on le stocke à la première lecture.
 */
function _tim_get_search_headings( int $post_id ): array {
    $h2 = get_post_meta( $post_id, '_search_h2', true );
    $h3 = get_post_meta( $post_id, '_search_h3', true );

    if ( ! is_array( $h2 ) && ! is_array( $h3 ) ) {
        return _tim_refresh_search_headings( $post_id );
    }

    return [
        'h2' => is_array( $h2 ) ? $h2 : [],
        'h3' => is_array( $h3 ) ? $h3 : [],
    ];
}

// Priorité 20 : on passe APRÈS ACF (qui sauvegarde ses meta à priorité 10),
// sinon get_field() lirait l'ancienne valeur.
add_action( 'save_post_feature', function ( int $post_id ) {
    if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) return;
    _tim_refresh_search_headings( $post_id );
}, 20 );
