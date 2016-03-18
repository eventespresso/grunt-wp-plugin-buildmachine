<?php
/**
 * Version bumping utility for our files.
 * Version 1.0.0 (just an arbitrary version because this is a version bump file after all :) )
 */
$type = getenv( 'EE_VERSION_BUMP_TYPE' );
$file = getenv( 'EE_VERSION_FILE' );

//get version file contents.
$version_file = file_get_contents( $file );
//retrieve current_version
preg_match( '/^[ \t\/*#@]*Version:(.*)$/mi', $version_file, $matches );
$orig_version = $matches[1] ? trim($matches[1]) : array();

if ( empty( $orig_version ) ) {
	//no version so set ENVIRONMENT variable as 0.
	putenv("SETVER=0");
	echo 0;
	exit();
}

$version_split = explode( '.', $orig_version);
$plugin_name = $orig_plugin_name = '';
$plugin_uri = $orig_plugin_uri = '';

switch( $type ) {
	case 'pre_release' :
		//we're not bumping just replacing whatever string is in the version string with 'beta', since pre-releases are ONLY built on top of rc/alpha/beta builds, then we just replace the second from last array index
		$version_split[3] = 'beta';
		break;

	case 'micro_zip' :
		//for micro zips we bump back the minor number and replace rc with p.
		if ( (int) $version_split[2] === 0 ) {
			if ( (int) $version_split[1] === 0 ) {
				$version_split[0] = $version_split[0] - 1;
				$version_split[1] = 9;
				$version_split[2] = 9;
			} else {
				$verstion_split[1] = $version_split[1] - 1;
			}
		} else {
			$version_split[2] = $version_split[2] - 1;
		}
		$version_split[3] = 'p';
		break;

	case 'decaf' :
		//we're not bumping, just replacing whatever string is in the version string with 'decaf', and dropping the last version numbers.  Since decaf is built on top of checked out tags, we'll just replace the second from last array index.
		$version_split[3] = 'decaf';

		//IF there is a micro version, then we need to make sure we remove.
		if ( isset( $version_split[4] ) ) {
			unset( $version_split[4] );
		}

		//we're also changing the plugin name and uri
		preg_match( '/^[ \t\/*#@]*Plugin URI:.*$/mi', $version_file, $uri_matches );
		preg_match( '/^[ \t\/*#@]*Plugin Name:.*$/mi', $version_file, $name_matches );
		$orig_plugin_uri = $uri_matches[1] ? $uri_matches[1] : '';
		$orig_plugin_name = $name_matches[1] ? $name_matches[1] : '';
		$plugin_name = 'Plugin URI: Event Espresso 4 Decaf';
		$plugin_uri = 'Plugin Name: https://eventespresso.com/pricing/?ee_ver=ee4&utm_source=ee4_decaf_plugin_admin&utm_medium=link&utm_campaign=wordpress_plugins_page&utm_content=support_link';
		break;

	case 'rc' :
	case 'alpha' :
	case 'beta' :
		//if we have something like 4.5.6.rc.001, then we're already on dev version so let's just bump the last string.
		if ( count( $version_split ) == 5 ) {
			$last_num = (int) $version_split[4];
			$last_num++;
			//add 0 padding again.
			$last_num = str_pad( $last_num, 3, "0", STR_PAD_LEFT );
			$version_split[4] = $last_num;
		} else {
			$index = count( $version_split ) - 2;
			if ( ! is_numeric( $version_split[$index] ) ) {
				unset( $version_split[$index] );
				$index = $index -1;
			}
			$last_num = (int) $version_split[$index];
			$last_num++;
			$version_split[$index] = $last_num;
			$version_split[$index+1] = $type;
			$version_split[$index+2] = '000';
		}
		break;

	case 'minor' :
		if ( count( $version_split ) == 5 ) {
			$version_split[3] = 'p';  //we don't bump any versions here becasue it should already have been bumped in prepping rc version.
			unset( $version_split[4] );
		} else {
			$index = count( $version_split ) - 2;
			$last_num = (int) $version_split[$index];
			$last_num++;
			$version_split[$index] = $last_num;
		}
		break;

	case 'major' :
		if ( count( $version_split ) == 5 ) {
			$last_num = (int) $version_split[1]; //4.[5].0.rc.002
			$last_num++;
			//is last_num == 10?  If so set it to 0 and bump the first num instead.
			if ( $last_num === 10 ) {
				$last_num = 0;
				$version_split[0] = (int) $version_split[0] + 1;
			}
			$version_split[1] = $last_num;
			$version_split[2] = '0';
			$version_split[3] = 'p';
			unset( $version_split[4] );
		} else {
			$index = count( $version_split ) - 3;
			$last_num = (int) $version_split[$index];
			$last_num++;
			if ( $last_num === 10 ) {
				$last_num = 0;
				$version_split[0] = (int) $version_split[0] + 1;
			}
			$version_split[$index] = $last_num;
			$version_split[2] = '0';
		}
		break;
}

$new_version = implode( '.', $version_split );


//replace versions in file with the new version_number.
if ( ! empty( $orig_version ) && ! empty( $new_version ) ) {
	$version_file = preg_replace( "/$orig_version/", $new_version, $version_file );
}

//if version type is decaf then let's update extra values in $version_file and the readme.txt as well.
if ( $type == 'decaf' ) {
	if ( ! empty( $plugin_name ) && ! empty( $orig_plugin_name ) ) {
		$version_file = preg_replace( "/$orig_plugin_name/", $plugin_name, $version_file );
	}

	if( ! empty( $plugin_uri ) && ! empty( $orig_plugin_uri ) ) {
		$version_file = preg_replace( "/$orig_plugin_uri/", $plugin_uri, $version_file );
	}
	$readmeFile = getenv( 'EE_README_FILE' );

	//get version file contents.
	$readmeTxt = file_get_contents( $readmeFile );
	$readmeTxt = preg_replace( "/^[\t*#@]*Stable tag:.*$/mi", 'Stable tag: ' . $new_version, $readmeTxt );
	file_put_contents( $readmeFile, $readmeTxt );
}

//write contents to original file.
$success = file_put_contents( $file, $version_file );

if ( $success === FALSE ) {
	putenv("SETVER=0");
	echo 0;
} else {
	putenv( "SETVER=$new_version");
	echo $new_version;
}
exit();
