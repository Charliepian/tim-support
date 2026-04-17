<?php
/**
 * Plugin Name: TIM Support API
 * Description: Routes REST API, ACF et feedback pour le site support headless TIM Management
 * Version: 1.0.0
 * Author: Charlie Piancatelli
 */

if ( ! defined( 'ABSPATH' ) ) exit;

require_once plugin_dir_path( __FILE__ ) . 'includes/cors.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/acf.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/routes.php';
require_once plugin_dir_path( __FILE__ ) . 'includes/revalidate.php';
