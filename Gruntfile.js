/**
 * Event Espresso packager.
 * To setup the following must be installed:
 * node.js
 * grunt.js
 * grunt-cli.
 *
 * 1. Clone the ee plugin you want to use this with into a directory called "src" in the directory this file is in.
 * 2. Make sure the ee plugin has a info.json file in its top-level directory that contains json describing what's outlined in the "defaultParams" object (see below).
 * 3. Run "npm install" to make sure grunt and all its dependencies are installed
 * 4. That's it!  Commands you can run are seen as registered as a grunt task (example "grunt bumprc" will bump the rc version for the plugin).
 *
 * NOTE: This is still a work in progress and is by no means complete.  Use at your own risk!
 */

module.exports = function(grunt) {

	function setNewVersion( err, stdout, stderr, cb ) {
		grunt.config.set('new_version', stdout);
		grunt.log.writeln();
		grunt.log.ok('Version bumped to ' + stdout);
		if ( stdout != '0' ) {
			cb();
		} else {
			grunt.fail.warn( 'Something went wrong with setting the version' );
		}
	};

	function rm_prepare_folders( folders_to_remove ) {
		var folders = [];
		for ( var i = 0; i < folders_to_remove.length; i++ ) {
			folders[i] = 'rm -rf ' + folders_to_remove[i];
		}
		return folders;
	};

	var defaultParams = {
		"versionFile" : "",
		"slug" : "",
		"awsbucket" : "",
		"awsregion" : "",
		"releaseFilesRemove" : [],
		"decafFilesRemove" : [],
		"branch_to_update" : "test"
	};

	var defaultaws = {
		"accessKeyId" : "",
		"secretAccessKey" : ""
	};

	var eeParams = grunt.file.exists( 'src/info.json' ) ? grunt.file.readJSON( 'src/info.json' ) : defaultParams;

	//project config.
	grunt.initConfig({
		pkg: grunt.file.readJSON( 'package.json' ),
		aws: grunt.file.exists( 'aws.json' ) ? grunt.file.readJSON( 'aws.json' ) : defaultaws,
		eeParams: eeParams,
		new_version: '',

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
			remove_folders_release: {
				command: rm_prepare_folders( eeParams.releaseFilesRemove ).join('&&'),
			},
			remove_folders_decaf: {
				command: rm_prepare_folders( eeParams.decafFilesRemove ).join('&&')
			}
		},

		//git commands
		gitadd: {
			version: {
				options: {
					cwd: 'src',
					all: true
				}
			}
		},

		gitcommit: {
			//commit version bump.
			version: {
				options: {
					cwd: 'src',
					message: 'Bumping version to <%= new_version %>'
				},
			},
			//releasebump
			release: {
				options: {
					cwd: 'src',
					message: 'Bumping version to <%= new_version %> and prepped for release'
				}
			},

			releaseSansFiles: {
				options: {
					cwd: 'src',
					message: 'Prepping release minus folders/files not included with production.'
				}
			}
		},

		gittag: {
			releaseAll: {
				options: {
					cwd: 'src',
					tag: '<%= new_version %>',
					message: 'Tagging for <%= new_version %> with all files.'
				}
			},
			release: {
				options: {
					cwd: 'src',
					tag: '<%= new_version %>-sans-tests-tag',
					message: 'Tagging for <%= new_version %> for production.'
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
			},

			testingSetup: {
				options: {
					cwd: 'src',
					branch: 'testing_auto_updates',
					overwrite: true
				}
			},

			testing: {
				options: {
					cwd : 'src',
					branch: 'testing_auto_updates',
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
			},

			testing: {
				options: {
					cwd: 'src',
					branch: 'testing_auto_updates',
					tags: false
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
					output: '../build/<%= eeParams.slug %>.zip'
				}
			}
		},


		//awss3stuff
		aws_s3: {
			options: {
				accessKeyId: '<%= aws.accessKeyId %>',
				secretAccessKey: '<%= aws.secretAccessKey %>',
				region: '<%= eeParams.awsregion %>',
				bucket: '<%= eeParams.awsbucket %>'
			},

			release: {
				files: [{
					cwd: 'build/',
					src: ['<%= eeParams.slug %>.zip']
				}]
			}
		}
	});

	//load plugins providing the task.
	grunt.loadNpmTasks( 'grunt-shell' );
	grunt.loadNpmTasks( 'grunt-git' );


	//bumping rc version
	//grunt.registerTask( 'bumprc', ['gitcheckout:master', 'shell:bump_rc', 'gitadd:version', 'gitcommit:version', 'gitpush:bump'] );
	grunt.registerTask( 'testingbumprc', ['gitcheckout:testingSetup', 'shell:bump_rc', 'gitadd:version', 'gitcommit:version', 'gitpush:testing'])

	//bumping minor version and releasing hotfix
	//grunt.registerTask( 'hotfix', ['gitcheckout:master','shell:bump_minor', 'gitadd:version', 'gitcommit:release', 'gitcheckout:release', 'gittag:releaseAll', 'shell:remove_folders_release', 'gitadd:version', 'gitcommit:release', 'gittag:release', 'gitarchive:release', 'gitcheckout:master', 'shell:bump_rc', 'gitadd:version', 'gitcommit:version' 'gitpush:release' ] );
	grunt.registerTask( 'testinghotfix', ['gitcheckout:testingSetup','shell:bump_minor', 'gitadd:version', 'gitcommit:release', 'gitcheckout:release', 'gittag:releaseAll', 'shell:remove_folders_release', 'gitadd:version', 'gitcommit:release', 'gittag:release', 'gitarchive:release', 'gitcheckout:testing', 'shell:bump_rc', 'gitadd:version', 'gitcommit:version','gitpush:testing' ] );

	//bumping major versions and releasing.
	//grunt.registerTask( 'release', ['gitcheckout:master','shell:bump_major', 'gitadd:version', 'gitcommit:release', 'gitcheckout:release', 'gittag:releaseAll', 'shell:remove_folders_release', 'gittag:release', 'gitarchive:release', 'gitcheckout:master', 'shell:bump_rc', 'gitpush:release' ] );
	grunt.registerTask( 'testingrelease', ['gitcheckout:testingSetup','shell:bump_major', 'gitadd:version', 'gitcommit:release', 'gitcheckout:release', 'gittag:releaseAll', 'shell:remove_folders_release', 'gitadd:version', 'gitcommit:release', 'gittag:release', 'gitarchive:release', 'gitcheckout:testing', 'shell:bump_rc', 'gitadd:version', 'gitcommit:version', 'gitpush:testing' ] );
}
