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
		"versionType" : "rc",
		"slug" : "",
		"archiveBaseUrl" : "",
		"archiveBasePath" : "",
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

	var defaulthipchat = {
		"authToken" : "",
		"roomID" : ""
	};

	var defaultPrivate = {
		"archiveUser" : "",
		"archivePass" : ""
	};

	var eeParams = grunt.file.exists( 'src/info.json' ) ? grunt.file.readJSON( 'src/info.json' ) : defaultParams;

	//project config.
	grunt.initConfig({
		pkg: grunt.file.readJSON( 'package.json' ),
		aws: grunt.file.exists( 'aws.json' ) ? grunt.file.readJSON( 'aws.json' ) : defaultaws,
		hipchat: grunt.file.exists( 'hipchat.json' ) ? grunt.file.readJSON( 'hipchat.json' ): defaulthipchat,
		privateParams: grunt.file.exists( 'private.json' ) ? grunt.file.readJSON( 'private.json' ) : defaultPrivate,
		eeParams: eeParams,
		new_version: '',
		taskCount: 0,
		taskCompleted: 0,
		notificationMessage: '',

		//shell commands
		shell: {
			//bump dev version.
			bump_rc: {
				notify: 'Bump Version task completed.  Version bumped to <%= new_version %>',
				command: [
					'export EE_VERSION_BUMP_TYPE="<%=eeParams.versionType %>"',
					'export EE_VERSION_FILE="src/<%= eeParams.versionFile %>"',
					'php version-bump.php'
					].join('&&'),
				options: {
					callback: setNewVersion,
					stdout: false
				}
			},
			bump_minor: {
				notify: 'Bump Version task completed.  Version bumped to <%= new_version %>',
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
				notify: 'Bump Version task completed.  Version bumped to <%= new_version %>',
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
				notify: '<%= eeParams.releaseFilesRemove.length %> folders and files removed in prep for release.',
				command: rm_prepare_folders( eeParams.releaseFilesRemove ).join('&&'),
			},
			remove_folders_decaf: {
				notify: '<%= eeParams.releaseFilesRemove.length %> folders and files removed in prep for decaf release.',
				command: rm_prepare_folders( eeParams.decafFilesRemove ).join('&&')
			},
			shareBuild : {
				notify: 'Archive folder has been made available and can be retreived from <a href="<%= eeParams.archiveBaseUrl %><%= eeParams.slug %>.zip">clicking here</a>.  Username: <%= privateParams.archiveUser %>.  Password: <%= privateParams.archivePass %>.',
				command: 'mv build/<%= eeParams.slug %>.zip <%= eeParams.archiveBasePath %>'
			}
		},

		//git commands
		gitadd: {
			version: {
				notify: 'Staged changes for commit.',
				options: {
					cwd: 'src',
					all: true
				}
			}
		},

		gitcommit: {
			//commit version bump.
			version: {
				notify: 'Commited rc version bump.',
				options: {
					cwd: 'src',
					message: 'Bumping version to <%= new_version %>'
				},
			},
			//releasebump
			release: {
				notify: 'Commited release version bump.',
				options: {
					cwd: 'src',
					message: 'Bumping version to <%= new_version %> and prepped for release'
				}
			},

			releaseSansFiles: {
				notify: 'Commited release minus folders/files not included with production bump.',
				options: {
					cwd: 'src',
					message: 'Prepping release minus folders/files not included with production.'
				}
			}
		},

		gittag: {
			releaseAll: {
				notify: 'Tagged for <%= new_version %> with all files.',
				options: {
					cwd: 'src',
					tag: '<%= new_version %>',
					message: 'Tagging for <%= new_version %> with all files.'
				}
			},
			release: {
				notify: 'Tagged for <%= new_version %> with all files except those not included with release.',
				options: {
					cwd: 'src',
					tag: '<%= new_version %>-sans-tests-tag',
					message: 'Tagging for <%= new_version %> for production.'
				}
			}
		},

		gitcheckout: {

			release: {
				notify: 'Checking out release preparation branch.',
				options: {
					cwd: 'src',
					branch: 'release_prep',
					overwrite: true
				}
			},

			master: {
				notify: 'Checking out master branch.',
				options: {
					cwd: 'src',
					branch: 'master'
				}
			},

			testingSetup: {
				notify: 'Checking out testing branch and ensuring its created and mirroring originating branch.  (This branch is used for non-destructive testing of grunt tasks).',
				options: {
					cwd: 'src',
					branch: 'testing_auto_updates',
					overwrite: true
				}
			},

			testing: {
				notify: 'Checking out testing branch.  (This branch is used for non-destructive testing of grunt tasks).',
				options: {
					cwd : 'src',
					branch: 'testing_auto_updates',
				}
			}
		},

		gitpull: {
			master: {
				notify: 'Pulling master branch from remote (make sure all up to date!.',
				options: {
					cwd: 'src',
					branch: 'master'
				}
			}
		},

		gitpush: {
			release: {
				notify: 'Pushing master branch to remote along with all tags (for releases).',
				options: {
					cwd: 'src',
					branch: 'master',
					tags: true
				}
			},

			bump: {
				notify: 'Pushing master branch to remote.',
				options: {
					cwd: 'src',
					branch: 'master'
				}
			},

			testing: {
				notify: 'Pushing testing branch to remote (used for testing git grunt tasks non-destructively)',
				options: {
					cwd: 'src',
					branch: 'testing_auto_updates',
					tags: false
				}
			}
		},

		gitarchive: {
			release: {
				notify: 'Archiving zip build for release.',
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
				notify: 'Uploaded archive file to s3 account.',
				files: [{
					cwd: 'build/',
					src: ['<%= eeParams.slug %>.zip']
				}]
			}
		},

		hipchat_notifier : {
			options: {
				authToken: '<%= hipchat.authToken %>',
				roomId: '<%= hipchat.roomID %>'
			},

			notify_team: {
				options: {
					message: '<%= notificationMessage %>',
					from: "GruntBot",
					color: "purple",
					message_format: "html"
				}
			}
		}
	});

	//load plugins providing the task.
	grunt.loadNpmTasks( 'grunt-shell' );
	grunt.loadNpmTasks( 'grunt-git' );
	grunt.loadNpmTasks('grunt-hipchat-notifier');

	grunt.registerTask( 'setNotifications', 'Testing what is available for custom grunt tasks', function setNotifications() {
		//grab what notification we're running.
		//grab message.
		var nameregex = new RegExp( this.name + '\\.', 'g' );
		var options_string = this.nameArgs.replace(/:/g, '.');
		var task_name = options_string.replace(nameregex, '');
		var task_notification = task_name + '.notify';
		var msg = grunt.config.get( 'notificationMessage' );

		if ( this.args[0] == 'init' ) {
			/** @todo Set a background colour property for notifications dynamically depending on the task alias that is running.  So rc version bumps could be purple, HOTFIX could be yellow, and RELEASE could be green?  */
			msg = '<b>GruntBOT activity Report:</b><br>';
			msg += 'Task Group Run: <b>' + this.args[1] + '</b><br><br>';
			msg += 'Notification Messages:<br>';
			msg += '<ul>';
			grunt.config.set( 'notificationMessage', msg );
			grunt.log.ok( 'Messages initialized for notifications successfully.' );
			return true;
		} else if ( this.args[0] == 'end' ) {
			msg += '</ul>';
			grunt.config.set( 'notificationMessage', msg );
			return true;
		}

		//grab any notify message for the given action.
		var notification_message = grunt.config.get( task_notification );
		if ( notification_message !== null ) {
			msg += '<li>' + notification_message + '</li>';
			grunt.log.ok( notification_message );
			grunt.config.set( 'notificationMessage', msg );
		}
		return true;
	});

	//bumping rc version
	//grunt.registerTask( 'bumprc', ['setNotifications:init:bumprc', 'gitcheckout:master', 'setNotifications:gitcheckout:master',  'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotificationsgitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version', 'gitpush:bump', 'setNotifications:gitpush:bump', 'setNotifications:end'] );
	grunt.registerTask( 'testingbumprc', ['setNotifications:init:testingbumprc', 'gitcheckout:testingSetup', 'setNotifications:gitcheckout:testingSetup', 'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version',  'gitpush:testing', 'setNotifications:gitpush:testing', 'setNotifications:end', 'hipchat_notifier:notify_team'] );

	//bumping minor version and releasing hotfix
	//grunt.registerTask( 'hotfix', ['setNotifications:init:hotfix', 'gitcheckout:master', 'setNotifications:gitcheckout:master', 'shell:bump_minor', 'setNotificationsshell:bump_minor', 'gitadd:version', setNotifications:gitadd:version', 'gitcommit:release', 'setNotifications:gitcommit:release', 'gitcheckout:release', 'setNotifications:gitcheckout:release', 'gittag:releaseAll', 'setNotifications:gittag:releaseAll', 'shell:remove_folders_release', 'setNotifications:shell:remove_folders_release', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:release', 'setNotifications:gitcommit:release', 'gittag:release', 'setNotifications:gittag:release', 'gitarchive:release', 'setNotifications:gitarchive:release', 'gitcheckout:master', 'setNotifications:gitcheckout:master', 'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version', 'gitpush:release','shell:shareBuild', 'setNotifications:shell:shareBuild','setNotifications:gitpush:release', 'setNotifications:end'] );
	grunt.registerTask( 'testinghotfix', ['setNotifications:init:testinghotfix', 'gitcheckout:testingSetup', 'setNotifications:gitcheckout:testingSetup', 'shell:bump_minor', 'setNotifications:shell:bump_minor', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:release', 'setNotifications:gitcommit:release', 'gitcheckout:release', 'setNotifications:gitcheckout:release', 'gittag:releaseAll', 'setNotifications:gittag:releaseAll', 'shell:remove_folders_release', 'setNotifications:shell:remove_folders_release', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:release', 'setNotifications:gitcommit:release', 'gittag:release', 'setNotifications:gittag:release', 'gitarchive:release', 'setNotifications:gitarchive:release', 'gitcheckout:testing', 'setNotifications:gitcheckout:testing', 'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version', 'gitpush:testing', 'setNotifications:gitpush:testing', 'shell:shareBuild', 'setNotifications:shell:shareBuild','setNotifications:end' ] );

	//bumping major versions and releasing.
	//grunt.registerTask( 'release', ['gitcheckout:master','shell:bump_major', 'gitadd:version', 'gitcommit:release', 'gitcheckout:release', 'gittag:releaseAll', 'shell:remove_folders_release', 'gittag:release', 'gitarchive:release', 'gitcheckout:master', 'shell:bump_rc', 'gitpush:release' ] );
	grunt.registerTask( 'testingrelease', ['gitcheckout:testingSetup','shell:bump_major', 'gitadd:version', 'gitcommit:release', 'gitcheckout:release', 'gittag:releaseAll', 'shell:remove_folders_release', 'gitadd:version', 'gitcommit:release', 'gittag:release', 'gitarchive:release', 'gitcheckout:testing', 'shell:bump_rc', 'gitadd:version', 'gitcommit:version', 'gitpush:testing' ] );
}
