/**
 * Event Espresso packager.
 * To setup the following must be installed:
 * node.js
 * grunt.js
 * grunt-cli.
 *
 * 1. Clone the ee plugin you want to use this with into a directory called "src" in the directory this file is in.
 * 2. Make sure the ee plugin has a info.json file in its top-level directory that contains json describing what's outlined in the "defaultParams" object (see below).
 * 3. That's it!  Commands you can run are seen as registered as a grunt task (example "grunt bumprc" will bump the rc version for the plugin).
 *
 * NOTE: This is still a work in progress and is by no means complete.  Use at your own risk!
 */

module.exports = function(grunt) {
	var new_version = '';

	function setNewVersion( err, stdout, stderr, cb ) {
		new_version = stdout;
		grunt.log.writeln();
		grunt.log.ok('Version bumped to ' + new_version);
		if ( new_version != '0' ) {
			cb();
		} else {
			grunt.fail.warn( 'Something went wrong with setting the version' );
		}
	}

	var defaultParams = {
		"versionFile" : "",
		"slug" : ""
	};

	//project config.
	grunt.initConfig({
		pkg: grunt.file.readJSON( 'package.json' ),
		eeParams: grunt.file.exists( 'src/info.json' ) ? grunt.file.readJSON( 'src/info.json' ) : defaultParams,

		//shell commands
		shell: {
			//bump dev version.
			bump_rc: {
				command: [
					'export EE_VERSION_BUMP_TYPE="rc"',
					'export EE_VERSION_FILE="src/<%= eeParams.versionFile %>"',
					'php version-bump.php'
					].join('&&'),
				options: {
					callback: setNewVersion,
					stdout: false
				}
			},
			bump_minor: {
				command: [
					'export EE_VERSION_BUMP_TYPE="minor"',
					'export EE_VERSION_FILE="src/<%= eeParams.versionFile %>"',
					'php version-bump.php'
					].join('&&'),
				options: {
					callback: setNewVersion,
					stdout: false
				}
			},
			bump_major: {
				command: [
					'export EE_VERSION_BUMP_TYPE="major"',
					'export EE_VERSION_FILE="src/<%= eeParams.versionFile %>"',
					'php version-bump.php'
					].join('&&'),
				options: {
					callback: setNewVersion,
					stdout: false
				}
			},
		},

		//git commands
		gitcommit: {
			//commit version bump.
			version: {
				options: {
					cwd: 'src',
					message: 'Bumping version to <%= new_version =>'
				},
			},
			//releasebump
			release: {
				options: {
					cwd: 'src',
					message: 'Bumping version to <%= new_version => and prepped for release'
				}
			}
		},

		gittag: {
			releaseAll: {
				options: {
					cwd: 'src',
					tag: new_version,
					message: 'Tagging for <%= new_version => with all files.'
				}
			},
			release: {
				options: {
					cwd: 'src',
					tag: new_version,
					message: 'Tagging for <%= new_version => for production.'
				}
			}
		},

		gitcheckout: {
			release: {
				options: {
					cwd: 'src',
					branch: 'release_prep',
					overwrite: true
				}
			},

			master: {
				options: {
					cwd: 'src',
					branch: 'master'
				}
			}
		},

		gitpull: {
			master: {
				options: {
					cwd: 'src',
					branch: 'master'
				}
			}
		},

		gitpush: {
			release: {
				options: {
					cwd: 'src',
					branch: 'master',
					tags: true
				}
			},

			bump: {
				options: {
					cwd: 'src',
					branch: 'master'
				}
			}
		},

		gitarchive: {
			release: {
				options: {
					cwd: 'src',
					treeIsh: 'release_prep',
					format: 'zip',
					prefix: '<%= eeParams.slug %>/',
					output: '/build/<%= eeParams.slug %>.zip'
				}
			}
		},


		//rm tests and stuff we don't bundle for releases.
		rm: {
			release: [
				'src/tests/**',
				'src/info.json',
				'src/circle.yml',
				'src/screenshot*.jpg'
			],
			decaf: [
				'src/tests/**',
				'src/info.json',
				'src/circle.yml',
				'src/screenshot*.jpg',
				'src/caffeinated/**'
			]
		}

	});

	//load plugins providing the task.
	grunt.loadNpmTasks( 'grunt-shell' );

	//register Tasks
	grunt.registerTask( 'bumprc', ['shell:bump_rc'] );
	grunt.registerTask( 'hotfix', ['shell:bump_minor'] );
	grunt.registerTask( 'release', ['shell:bump_major'] );
}
