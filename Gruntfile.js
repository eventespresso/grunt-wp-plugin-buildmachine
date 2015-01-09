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


	//project config.
	grunt.initConfig({
		pkg: grunt.file.readJSON( 'package.json' ),
		aws: grunt.file.exists( 'aws.json' ) ? grunt.file.readJSON( 'aws.json' ) : defaultaws,
		hipchat: grunt.file.exists( 'hipchat.json' ) ? grunt.file.readJSON( 'hipchat.json' ): defaulthipchat,
		privateParams: grunt.file.exists( 'private.json' ) ? grunt.file.readJSON( 'private.json' ) : defaultPrivate,
		eeParams: defaultParams,
		new_version: '',
		rc_version: null,
		minor_version: null,
		major_version: null,
		taskCount: 0,
		taskCompleted: 0,
		notificationMessage: '',
		notificationColor: 'grey',

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
			prVersion: {
				notify: 'Version changed for pr (adding beta prefix). Version changed to <%= new_version %>',
				command: [
					'export EE_VERSION_BUMP_TYPE="pre_release"',
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
				command: '',
			},
			remove_folders_decaf: {
				notify: '<%= eeParams.releaseFilesRemove.length %> folders and files removed in prep for decaf release.',
				command: ''
			},
			shareBuild : {
				notify: 'Archive folder has been made available and can be retrieved from <a href="<%= eeParams.archiveBaseUrl %><%= eeParams.slug %>.zip">clicking here</a>.  Username: <%= privateParams.archiveUser %>.  Password: <%= privateParams.archivePass %>.',
				command: 'mv build/<%= eeParams.slug %>.zip <%= eeParams.archiveBasePath %>'
			},
			shareBuildpr : {
				notify: 'Archive folder has been made available and can be retrieved from <a href="<%= eeParams.archiveBaseUrl %><%= eeParams.slug %>-pr.zip">clicking here</a>.  Username: <%= privateParams.archiveUser %>.  Password: <%= privateParams.archivePass %>.',
				command: 'mv build/<%= eeParams.slug %>-pr.zip <%= eeParams.archiveBasePath %>'
			},
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

		gitreset: {
			clean: {
				notify: 'Reset to latest commit (HEAD).',
				options: {
					cwd: 'src',
					mode: 'hard',
					commit: 'HEAD'
				}
			}
		},

		gitcommit: {
			//commit version bump.
			version: {
				notify: 'Commited <%= eeParams.versionType %> version bump.',
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
			},
			prRelease: {
				notify: 'Commited release version change for pr.',
				options: {
					cwd: 'src',
					message: 'Changed version to <%= new_version %> and prepped for pre release'
				}
			},
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

			alpha: {
				notify: 'Checkout out alpha branch.',
				options: {
					cwd: 'src',
					branch: 'alpha'
				}
			},

			beta: {
				notify: 'Checkout out beta branch.',
				options: {
					cwd: 'src',
					branch: 'beta'
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
			},

			alpha: {
				notify: 'Pulling alpha branch from remote (make sure all up to date!.',
				options: {
					cwd: 'src',
					branch: 'alpha'
				}
			},

			beta: {
				notify: 'Pulling beta branch from remote (make sure all up to date!.',
				options: {
					cwd: 'src',
					branch: 'beta'
				}
			},
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


			bump_alpha: {
				notify: 'Pushing alpha branch to remote.',
				options: {
					cwd: 'src',
					branch: 'alpha'
				}
			},

			bump_beta: {
				notify: 'Pushing beta branch to remote.',
				options: {
					cwd: 'src',
					branch: 'beta'
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
			},
			prRelease: {
				notify: 'Archiving zip build for pre release channel.',
				options: {
					cwd: 'src',
					treeIsh: 'release_prep',
					format: 'zip',
					prefix: '<%= eeParams.slug %>/',
					output: '../build/<%= eeParams.slug %>-pr.zip'
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
					color: "<%= notificationColor %>",
					message_format: "html"
				}
			}
		},

		//css minification
		cssmin : {
			minify: {
				files: [{
					expand: true,
					cwd: 'src',
					src: ['*.css', '!*.min.css'],
					dest: 'src',
					ext: '.min.css'
				}]
			}
		}
	});

	//load plugins providing the task.
	grunt.loadNpmTasks( 'grunt-shell' );
	grunt.loadNpmTasks( 'grunt-git' );
	grunt.loadNpmTasks('grunt-hipchat-notifier');
	grunt.loadNpmTasks('grunt-contrib-cssmin');

	function postnewTopic( roomInfo, hipchat, done ) {
		var roomID = '424398';
		var authToken = grunt.config.get( 'hipchat_notifier.options.authToken' );
		/*grunt.verbose.writeln( console.log( roomInfo ) );*/
		var currentTopic = roomInfo.room.topic;
		/*grunt.verbose.writeln( console.log( currentTopic ) );*/

		//let's parse and replace elements of the topic.
		var versions = {
			rc : grunt.config.get( 'rc_version' ),
			minor : grunt.config.get( 'minor_version' ),
			major: grunt.config.get( 'major_version' ),
			vrtype: grunt.config.get( 'eeParams.versionType')
		}
		/*grunt.verbose.ok( console.log(versions) );*/
		if ( versions.rc !== null ) {
			if ( versions.vrtype == 'rc' ) {
				currentTopic = currentTopic.replace( /MASTR\:*.[0-9]\.[0-9]\.[0-9]\.rc\.[0-9]{3}/g, 'MASTR: ' + versions.rc );
			} else if ( versions.vrtype == 'alpha' ) {
				currentTopic = currentTopic.replace( /ALPHA\:*.[0-9]\.[0-9]\.[0-9]\.alpha\.[0-9]{3}/g, 'ALPHA: ' + versions.rc );
			} else if ( versions.vrtype == 'beta' ) {
				currentTopic = currentTopic.replace( /BETA\:*.[0-9]\.[0-9]\.[0-9]\.beta\.[0-9]{3}/g, 'BETA: ' + versions.rc );
			}
		}

		if ( versions.minor !== null  ) {
			currentTopic = currentTopic.replace( /REL\:*.[0-9]\.[0-9]\.[0-9]\.p/, 'REL: ' + versions.minor );
		}

		if ( versions.major !== null ) {
			currentTopic = currentTopic.replace( /REL\:*.[0-9]\.[0-9]\.[0-9]\.p/, 'REL: ' + versions.major );
		}
		//SET new topic
		hipchat.api.rooms.topic( { room_id: roomID, topic: currentTopic, from: 'gruntBOT' }, function( err, res ) {
			if ( err ) { throw err; }
			grunt.log.ok( 'Topic changed for hipchat' );
			var msg = grunt.config.get( 'notificationMessage' );
			msg += '<li>HipChat topic changed for Main Chat room.</li>'
			msg += '<strong>The notifications above are for ' + grunt.config.get( 'eeParams.slug' ) + '.</strong>';
			msg += '</ul>';
			grunt.config.set( 'notificationMessage', msg );
			done();
		} );
	};

	grunt.registerTask( 'setNotifications', 'Testing what is available for custom grunt tasks', function setNotifications() {
		//grab what notification we're running.
		//grab message.
		var nameregex = new RegExp( this.name + '\\.', 'g' );
		var options_string = this.nameArgs.replace(/:/g, '.');
		var task_name = options_string.replace(nameregex, '');
		var task_notification = task_name + '.notify';
		var msg = grunt.config.get( 'notificationMessage' );

		if ( this.args[0] == 'init' ) {
			msg = '<b>GruntBOT activity Report for:</b><br>';
			msg += 'Task Group Run: <b>' + this.args[1] + '</b><br><br>';
			msg += 'Notification Messages:<br>';
			msg += '<ul>';
			grunt.config.set( 'notificationMessage', msg );
			grunt.log.ok( 'Messages initialized for notifications successfully.' );

			grunt.verbose.writeln( console.log(this.args) );

			//set background color for chat client:
			if ( typeof this.args[2] !== 'undefined' && this.args[2] !== null ) {
				grunt.config.set( 'notificationColor', this.args[2] );
			}

			return true;
		} else if ( this.args[0] == 'end' ) {



			/**
			 * update topic in hipchat room! BUT only if updating event-espresso-core
			 */
			if ( grunt.config.get( 'eeParams.slug' ) == 'event-espresso-core-reg' ) {
				var HipchatClient, hipchat;
				HipchatClient = require('hipchat-client');
				var roomID = '424398';
				var authToken = grunt.config.get( 'hipchat_notifier.options.authToken' );
				var done = this.async();
				hipchat = new HipchatClient( authToken );
				//get current topic
				var currentRoom;
				try {
					hipchat.api.rooms.show( {room_id: roomID }, function(err, res) {
						if ( err ) { throw err; }
						postnewTopic( res, hipchat, done );
					});

				} catch(e) {
					grunt.verbose.or.write('error with posting topic').error().error(e.message );
					msg += '</ul>';
					msg += '<strong>The notifications above are for ' + grunt.config.get( 'eeParams.slug' ) + '.</strong>';
					grunt.config.set( 'notificationMessage', msg );
					return;
				}
			} else {
				msg += '</ul>';
				msg += '<strong>The notifications above are for ' + grunt.config.get( 'eeParams.slug' ) + '.</strong>';
				grunt.config.set( 'notificationMessage', msg );
			}

			return true;
		}

		//grab any notify message for the given action.
		var notification_message = grunt.config.get( task_notification );
		var new_version = grunt.config.get( 'new_version' );
		grunt.verbose.ok( task_name );
		grunt.verbose.ok( new_version );
		if ( notification_message !== null ) {
			switch ( task_name ) {
				case 'shell.bump_rc' :
					grunt.config.set( 'rc_version', new_version );
					break;
				case 'shell.bump_minor' :
					grunt.config.set( 'minor_version', new_version );
					break;
				case 'shell.bump_major' :
					grunt.config.set( 'major_version', new_version );
					break;
			}
			msg += '<li>' + notification_message + '</li>';
			grunt.verbose.ok( notification_message );
			grunt.config.set( 'notificationMessage', msg );
		}
		return true;
	});


	//delayed setting of eeParams (want to set after initial checkout).
	grunt.registerTask( 'seteeParams', 'Delayed setting of eeParams after initial checkout so correct info.json file is read', function seteeParams() {
		var params =  grunt.file.exists( 'src/info.json' ) ? grunt.file.readJSON( 'src/info.json' ) : null;

		if  ( params === null ) {
			grunt.fail.warn('The repo must have a valid info.json file in it with params for the remaining tasks');
		}
		grunt.log.ok( 'eeParams in config successfully retrieved from info.json');
		grunt.config.set( 'eeParams', params );

		//set commands for shell rm task
		grunt.config.set( 'shell.remove_folders_release.command', rm_prepare_folders( params.releaseFilesRemove ).join('&&') );
		grunt.config.set( 'shell.remove_folders_decaf', rm_prepare_folders( params.decafFilesRemove ).join('&&') );
	});


	//bumping rc version
	grunt.registerTask( 'bumprc_master', ['setNotifications:init:bumprc:purple', 'gitcheckout:master', 'setNotifications:gitcheckout:master', 'gitpull:master', 'seteeParams', 'setNotifications:gitpull:master',  'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version', 'gitpush:bump', 'setNotifications:gitpush:bump', 'setNotifications:end', 'hipchat_notifier:notify_team'] );
	grunt.registerTask( 'testingbumprc_master', ['setNotifications:init:testingbumprc:purple', 'gitcheckout:testingSetup', 'setNotifications:gitcheckout:testingSetup', 'seteeParams', 'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version',  'gitpush:testing', 'setNotifications:gitpush:testing', 'setNotifications:end', 'hipchat_notifier:notify_team'] );
	grunt.registerTask( 'bumprc_alpha', ['setNotifications:init:bumprc:purple', 'gitcheckout:alpha', 'setNotifications:gitcheckout:alpha', 'gitpull:alpha', 'seteeParams', 'setNotifications:gitpull:alpha', 'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version', 'gitpush:bump_alpha', 'setNotifications:gitpush:bump_alpha', 'setNotifications:end', 'hipchat_notifier:notify_team'] );
	grunt.registerTask( 'testingbumprc_alpha', ['setNotifications:init:testingbumprc:purple', 'gitcheckout:testingSetup', 'seteeParams', 'setNotifications:gitcheckout:testingSetup', 'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version',  'gitpush:testing', 'setNotifications:gitpush:testing', 'setNotifications:end', 'hipchat_notifier:notify_team'] );
	grunt.registerTask( 'bumprc_beta', ['setNotifications:init:bumprc:purple', 'gitcheckout:beta', 'setNotifications:gitcheckout:beta', 'gitpull:beta', 'seteeParams', 'setNotifications:gitpull:beta', 'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version', 'gitpush:bump_beta', 'setNotifications:gitpush:bump_beta', 'setNotifications:end', 'hipchat_notifier:notify_team'] );
	grunt.registerTask( 'testingbumprc_beta', ['setNotifications:init:testingbumprc:purple', 'gitcheckout:testingSetup', 'seteeParams', 'setNotifications:gitcheckout:testingSetup', 'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version',  'gitpush:testing', 'setNotifications:gitpush:testing', 'setNotifications:end', 'hipchat_notifier:notify_team'] );

	//bumping minor version and releasing hotfix
	grunt.registerTask( 'hotfix', ['setNotifications:init:hotfix:yellow', 'gitcheckout:master', 'setNotifications:gitcheckout:master', 'gitpull:master', 'seteeParams', 'setNotifications:gitpull:master',  'shell:bump_minor', 'setNotificationsshell:bump_minor', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:release', 'setNotifications:gitcommit:release', 'gitcheckout:release', 'setNotifications:gitcheckout:release', 'gittag:releaseAll', 'setNotifications:gittag:releaseAll', 'shell:remove_folders_release', 'setNotifications:shell:remove_folders_release', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:release', 'setNotifications:gitcommit:release', 'gittag:release', 'setNotifications:gittag:release', 'gitarchive:release', 'setNotifications:gitarchive:release', 'gitcheckout:master', 'setNotifications:gitcheckout:master', 'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version', 'gitpush:release','setNotifications:gitpush:release', 'shell:shareBuild', 'setNotifications:shell:shareBuild', 'setNotifications:end', 'hipchat_notifier:notify_team'] );
	grunt.registerTask( 'testinghotfix', ['setNotifications:init:testinghotfix:yellow', 'gitcheckout:testingSetup', 'setNotifications:gitcheckout:testingSetup', 'seteeParams', 'shell:bump_minor', 'setNotifications:shell:bump_minor', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:release', 'setNotifications:gitcommit:release', 'gitcheckout:release', 'setNotifications:gitcheckout:release', 'gittag:releaseAll', 'setNotifications:gittag:releaseAll', 'shell:remove_folders_release', 'setNotifications:shell:remove_folders_release', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:release', 'setNotifications:gitcommit:release', 'gittag:release', 'setNotifications:gittag:release', 'gitarchive:release', 'setNotifications:gitarchive:release', 'gitcheckout:testing', 'setNotifications:gitcheckout:testing', 'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version', 'gitpush:testing', 'setNotifications:gitpush:testing', 'shell:shareBuild', 'setNotifications:shell:shareBuild','setNotifications:end', 'hipchat_notifier:notify_team'] );

	//bumping major versions and releasing.
	grunt.registerTask( 'release', ['setNotifications:init:release:green', 'gitcheckout:master', 'setNotifications:gitcheckout:master', 'gitpull:master', 'seteeParams', 'setNotifications:gitpull:master', 'shell:bump_major','setNotifications:shell:bump_major', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:release', 'setNotifications:gitcommit:release', 'gitcheckout:release', 'setNotifications:gitcheckout:release', 'gittag:releaseAll', 'setNotifications:gittag:releaseAll', 'shell:remove_folders_release', 'setNotifications:shell:remove_folders_release', 'gittag:release', 'setNotifications:gittag:release', 'gitarchive:release', 'setNotifications:gitarchive:release', 'gitcheckout:master', 'setNotifications:gitcheckout:master', 'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitpush:release', 'setNotifications:gitpush:release', 'shell:shareBuild', 'setNotifications:shell:shareBuild', 'setNotifications:end', 'hipchat_notifier:notify_team' ] );
	grunt.registerTask( 'testingrelease', ['setNotifications:init:testingrelease:green', 'gitcheckout:testingSetup', 'setNotifications:gitcheckout:testingSetup', 'seteeParams', 'shell:bump_major', 'setNotifications:shell:bump_major', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:release', 'setNotifications:gitcommit:release', 'gitcheckout:release', 'setNotifications:gitcheckout:release', 'gittag:releaseAll', 'setNotifications:gittag:releaseAll', 'shell:remove_folders_release', 'setNotifications:shell:remove_folders_release', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:release', 'setNotifications:gitcommit:release', 'gittag:release', 'setNotifications:gittag:release', 'gitarchive:release', 'setNotifications:gitarchive:release', 'gitcheckout:testing', 'setNotifications:gitcheckout:testing', 'shell:bump_rc', 'setNotifications:shell:bump_rc', 'gitadd:version', 'setNotifications:gitadd:version', 'gitcommit:version', 'setNotifications:gitcommit:version', 'gitpush:testing', 'setNotifications:gitpush:testing', 'shell:shareBuild', 'setNotifications:shell:shareBuild', 'setNotifications:end', 'hipchat_notifier:notify_team' ] );



	//building pre-releases
	grunt.registerTask( 'pr_alpha', [
		'setNotifications:init:release:green',
		'gitcheckout:alpha',
		'setNotifications:gitcheckout:alpha',
		'gitpull:alpha',
		'seteeParams',
		'setNotifications:gitpull:alpha',
		'gitcheckout:release',
		'setNotifications:gitcheckout:release',
		'shell:prVersion',
		'setNotifications:shell:prVersion',
		'shell:remove_folders_release',
		'setNotifications:shell:remove_folders_release',
		'gitadd:version',
		'setNotifications:gitadd:version',
		'gitcommit:prRelease',
		'setNotifications:gitcommit:prRelease',
		'gitarchive:prRelease',
		'setNotifications:gitarchive:prRelease',
		'shell:shareBuildpr',
		'setNotifications:shell:shareBuildpr',
		'setNotifications:end',
		'hipchat_notifier:notify_team'
		]);
	grunt.registerTask( 'pr_beta', [
		'setNotifications:init:release:green',
		'gitcheckout:beta',
		'setNotifications:gitcheckout:beta',
		'gitpull:beta',
		'seteeParams',
		'setNotifications:gitpull:beta',
		'gitcheckout:release',
		'setNotifications:gitcheckout:release',
		'shell:prVersion',
		'setNotifications:shell:prVersion',
		'shell:remove_folders_release',
		'setNotifications:shell:remove_folders_release',
		'gitadd:version',
		'setNotifications:gitadd:version',
		'gitcommit:prRelease',
		'setNotifications:gitcommit:prRelease',
		'gitarchive:prRelease',
		'setNotifications:gitarchive:prRelease',
		'setNotifications:getreset:clean',
		'shell:shareBuildpr',
		'setNotifications:shell:shareBuildpr',
		'setNotifications:end',
		'hipchat_notifier:notify_team'
		]);
	grunt.registerTask( 'pr', [
		'setNotifications:init:release:green',
		'gitcheckout:master',
		'setNotifications:gitcheckout:master',
		'gitpull:master',
		'seteeParams',
		'setNotifications:gitpull:master',
		'gitcheckout:release',
		'setNotifications:gitcheckout:release',
		'shell:prVersion',
		'setNotifications:shell:prVersion',
		'shell:remove_folders_release',
		'setNotifications:shell:remove_folders_release',
		'gitadd:version',
		'setNotifications:gitadd:version',
		'gitcommit:prRelease',
		'setNotifications:gitcommit:prRelease',
		'gitarchive:prRelease',
		'setNotifications:gitarchive:prRelease',
		'setNotifications:getreset:clean',
		'shell:shareBuildpr',
		'setNotifications:shell:shareBuildpr',
		'setNotifications:end',
		'hipchat_notifier:notify_team'
		]);


	//other testing things
	grunt.registerTask( 'testingcssmin', ['seteeParams', 'gitcheckout:testingSetup', 'cssmin:minify'] );
}
