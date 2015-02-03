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
		grunt.log.ok('Version bumped to ' + stdout)
		if ( stdout != '0' ) {
			cb();
		} else {
			grunt.fail.warn( 'Something went wrong with setting the version' );
			cb();
		}/**/
	};

	function rm_prepare_folders( folders_to_remove ) {
		var folders = [];
		if ( typeof folders_to_remove === 'undefined' ) {
			return folders;
		}
		for ( var i = 0; i < folders_to_remove.length; i++ ) {
			folders[i] = 'rm -rf ' + folders_to_remove[i];
		}
		return folders;
	};

	var defaultParams = {
		"versionFile" : "",
		"versionType" : "rc",
		"slug" : "",
		"wpOrgSlug" : "",
		"wpOrgUser" : "",
		"wpOrgRelease" : "",
		"name" : "",
		"archiveBaseUrl" : "",
		"archiveBasePath" : "",
		"awsbucket" : "",
		"awsregion" : "",
		"releaseFilesRemove" : [],
		"decafFilesRemove" : [],
		"branch" : "",
		"sites" : null,
		"sandboxsite" : null,
		"sandboxdecafsite" : null,
		"sandboxUrl" : "",
		"sandboxdecafUrl" : "",
		"github" : false
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
		preReleaseBuild : false,
		microZipBuild : false,
		taskCount: 0,
		taskCompleted: 0,
		notificationMessage: '',
		mainChatMessage: '',
		mainChatColor: 'grey',
		notificationColor: 'grey',
		tagPush: false,

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
					stdout: true,
					stderr: false,
					stdin: false
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
					stdout: true,
					stderr: false,
					stdin: false
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
					stdout: true,
					stderr: false,
					stdin: false
				}
			},
			decafVersion: {
				notify: 'Decaf version task completed. Version changed to <%= new_version %>',
				command: [
					'export EE_VERSION_BUMP_TYPE="decaf"',
					'export EE_VERSION_FILE="src/<%= eeParams.versionFile %>"',
					'export EE_README_FILE="src/readme.txt"',
					'php version-bump.php'
				].join('&&'),
				options: {
					callback: setNewVersion,
					stdout: true,
					stderr: false,
					stdin: false
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
					stdout: true,
					stderr: false,
					stdin: false
				}
			},
			microZipVersion: {
				notify: 'Version changed for microzip (bumping back and using p). Version changed to <%= new_version %>',
				command: [
					'export EE_VERSION_BUMP_TYPE="micro_zip"',
					'export EE_VERSION_FILE="src/<%= eeParams.versionFile %>"',
					'php version-bump.php'
				].join('&&'),
				options: {
					callback: setNewVersion,
					stdout: true,
					stderr: false,
					stdin: false
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
			checkoutTag : {
				notify: 'Checking out <%= eeParams.wpOrgRelease %> version to be packaged for wordpress.org release.',
				command: [
					'cd src',
					'git checkout <%= eeParams.wpOrgRelease %> -B release_prep'
				].join('&&')
			},
			prepWPassets : {
				notify: 'Moving contents of wp-assets into correct directory.',
				command: [
					'rm -rf build/wp-org-assets',
					'mkdir build/wp-org-assets',
					'cp -r src/wp-assets/* build/wp-org-assets'
					].join(';')
			},
			prepWPBuild : {
				notify: 'Copying contents of plugin into wp-org build directory to prep for deploy to wordpress.org.',
				command: [
					'rm -rf build/wp-org',
					'mkdir build/wp-org',
					'cp -r src/* build/wp-org'
					].join(';')
			},
			renameMainFile : {
				notify: 'Renamed main file <em><%= eeParams.versionFile %></em> to <em><%=eeParams.wpOrgSlug %></em> to match the slug for the wordpress.org release.',
				command: 'mv src/<%= eeParams.versionFile %> src/<%= eeParams.wpOrgSlug %>.php'
			},
			shareBuild : {
				notify: 'Archive folder has been made available and can be retrieved from <a href="<%= eeParams.archiveBaseUrl %><%= eeParams.slug %>.zip">clicking here</a>.  Username: <%= privateParams.archiveUser %>.  Password: <%= privateParams.archivePass %>.',
				command: 'mv build/<%= eeParams.slug %>.zip <%= eeParams.archiveBasePath %>'
			},
			shareBuildpr : {
				notify: 'Archive folder has been made available and can be retrieved from <a href="<%= eeParams.archiveBaseUrl %><%= eeParams.slug %>.zip">clicking here</a>.  Username: <%= privateParams.archiveUser %>.  Password: <%= privateParams.archivePass %>.',
				command: 'mv build/<%= eeParams.slug %>.zip <%= eeParams.archiveBasePath %>'
			},
			shareBuildWP : {
				notify: 'Archive folder for WP deploy has been made available and can be retrieved from <a href="<%= eeParams.archiveBaseUrl %><%= eeParams.wpOrgSlug %>-wp.zip">clicking here</a>.  Username: <%= privateParams.archiveUser %>.  Password: <%= privateParams.archivePass %>.',
				command: 'mv build/<%= eeParams.wpOrgSlug %>-wp.zip <%= eeParams.archiveBasePath %>'
			},
			SandboxPull: {
				notify: 'Pulled <%= eeParams.branch %> branch to <a href="http://<%= eeParams.sandboxUrl %>"><%= eeParams.sandboxUrl %></a>',
				command: [
					'cd <%= eeParams.sandboxsite %>',
					'unset GIT_DIR',
					'git pull origin <%= eeParams.branch %>'
					].join('&&'),
				options: {
					stdout: false,
					stderr: false,
					stdin: false
				}
			},
			decafSandboxPull: {
				notify: 'Pulled <%= eeParams.branch %> branch to <a href="http://<%= eeParams.sandboxUrl %>"><%= eeParams.sandboxUrl %></a>',
				command: [
					'cd <%= eeParams.sandboxdecafsite %>',
					'unset GIT_DIR',
					'git pull origin <%= eeParams.branch %>'
				].join('&&'),
				options: {
					stdout: false,
					stderr: false,
					stdin: false
				}
			},
			githubPushTags: {
				notify: "Pushed <%= eeParams.branch %> branch to github repo along with all tags.",
				command: [
					'cd src',
					'unset GIT_DIR',
					'git push github <%= eeParams.branch %>',
					'git push github --tags'
				].join('&&'),
				options: {
					stdout: false,
					stderr:false,
					stdin: false
				}
			},
			githubPush: {
				notify: "Pushed <%= eeParams.branch %> branch to github repo.",
				command: [
					'cd src',
					'unset GIT_DIR',
					'git push github <%= eeParams.branch %>'
				].join('&&'),
				options: {
					stdout: false,
					stderr:false,
					stdin: false
				}
			}
		},

		gitinfo : {
			options: {
				cwd: 'src'
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

			releaseWP: {
				notify: 'Commited WP Release.',
				options: {
					cwd: 'src',
					message: 'Prepping wp release minus folders/files not included with wp org releases.'
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
					output: '../build/<%= eeParams.slug %>.zip'
				}
			},
			wpRelease: {
				notify: 'Archiving zip build for wp org channel.',
				options: {
					cwd: 'src',
					treeIsh: 'release_prep',
					format: 'zip',
					prefix: '<%= eeParams.wpOrgSlug %>/',
					output: '../build/<%= eeParams.wpOrgSlug %>-wp.zip'
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
			},

			notify_main_chat: {
				options: {
					roomId: '424398',
					message: '<%= mainChatMessage %>',
					from: "GruntBot",
					color: "<%= mainChatColor %>",
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
		},


		//deploy to wordpress.org
		wp_deploy: {
			deploy: {
				notify: 'Deployed to WordPress.org!',
				options: {
					plugin_slug: '<%= eeParams.wpOrgSlug %>',
					svn_user: '<%= eeParams.wpOrgUser %>',
					build_dir: 'build/wp-org',
					assets_dir: 'build/wp-org-assets'
				}
			}
		}
	});

	//load plugins providing the task.
	grunt.loadNpmTasks( 'grunt-shell' );
	grunt.loadNpmTasks( 'grunt-git' );
	grunt.loadNpmTasks('grunt-hipchat-notifier');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-gitinfo');
	grunt.loadNpmTasks('grunt-wp-deploy');

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
				currentTopic = currentTopic.replace( /MASTR\:*.[0-9]\.[0-9]\.[0-9]+\.rc\.[0-9]{3}/g, 'MASTR: ' + versions.rc );
			} else if ( versions.vrtype == 'alpha' ) {
				currentTopic = currentTopic.replace( /ALPHA\:*.[0-9]\.[0-9]\.[0-9]+\.alpha\.[0-9]{3}/g, 'ALPHA: ' + versions.rc );
			} else if ( versions.vrtype == 'beta' ) {
				currentTopic = currentTopic.replace( /BETA\:*.[0-9]\.[0-9]\.[0-9]+\.beta\.[0-9]{3}/g, 'BETA: ' + versions.rc );
			}
		}

		if ( versions.minor !== null  ) {
			currentTopic = currentTopic.replace( /REL\:*.[0-9]\.[0-9]\.[0-9]+\.p/, 'REL: ' + versions.minor );
		}

		if ( versions.major !== null ) {
			currentTopic = currentTopic.replace( /REL\:*.[0-9]\.[0-9]\.[0-9]+\.p/, 'REL: ' + versions.major );
		}
		//SET new topic
		hipchat.api.rooms.topic( { room_id: roomID, topic: currentTopic, from: 'gruntBOT' }, function( err, res ) {
			if ( err ) { throw err; }
			grunt.log.ok( 'Topic changed for hipchat' );
			var msg = grunt.config.get( 'notificationMessage' );
			msg += '<li>HipChat topic changed for Main Chat room.</li>';
			msg += '</ul>';
			msg += '<br><strong>The notifications above are for ' + grunt.config.get( 'eeParams.slug' ) + '.</strong>';
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

			switch ( this.args[1] ) {
				case 'pr_alpha' :
				case 'pr_beta' :
				case 'pr' :
					grunt.config.set( 'preReleaseBuild', true );
					break;
				case 'microzip' :
					grunt.config.set( 'microZipBuild', true );
					break;
			}

			return true;
		} else if ( this.args[0] == 'end' ) {



			/**
			 * update topic in hipchat room! BUT only if updating event-espresso-core
			 */
			if ( grunt.config.get( 'eeParams.slug' ) == 'event-espresso-core-reg' && grunt.config.get( 'microZipBuild' ) !== true ) {
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
					msg += '<br><strong>The notifications above are for ' + grunt.config.get( 'eeParams.slug' ) + '.</strong>';
					grunt.config.set( 'notificationMessage', msg );
					return;
				}
			} else {
				msg += '</ul>';
				msg += '<br><strong>The notifications above are for ' + grunt.config.get( 'eeParams.slug' ) + '.</strong>';
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

		var gitinfo = grunt.config.get( 'gitinfo' );
		if ( typeof gitinfo.local === 'undefined' ) {
			grunt.fail.warn( 'git info did not appear to work. It is needed to be able to complete tasks. So aborting.' );
		}

		//let's setup certain environment variables based on the git info we've received.
		if ( gitinfo.local.branch.current.name == 'master' ) {
			params.versionType = 'rc';
			params.branch = 'master';
		} else {
			params.versionType = params.branch = gitinfo.local.branch.current.name;
		}

		//pre-release-build?
		if ( grunt.config.get( 'preReleaseBuild' ) ) {
			params.slug = params.slug.replace('-reg', '' );
			params.slug += '-pr';
		}

		if ( params.sites !== null && typeof params.sites !== 'undefined' ) {
			params.sandboxsite = params['sites'][params.branch]['sandboxsite']  !== 'undefined' ? params['sites'][params.branch]['sandboxsite'] : null;
			params.sandboxdecafsite =  params['sites'][params.branch]['sandboxdecafsite']  !== 'undefined' ? params['sites'][params.branch]['sandboxdecafsite'] : null;
			params.sandboxUrl =  params['sites'][params.branch]['sandboxUrl']  !== 'undefined' ? params['sites'][params.branch]['sandboxUrl'] : null;
			params.sandboxdecafUrl =  params['sites'][params.branch]['sandboxdecafUrl']  !== 'undefined' ? params['sites'][params.branch]['sandboxdecafUrl'] : null;
		}

		grunt.config.set( 'eeParams', params );

		//set commands for shell rm task
		grunt.config.set( 'shell.remove_folders_release.command', rm_prepare_folders( params.releaseFilesRemove ).join(';') );
		grunt.config.set( 'shell.remove_folders_decaf.command', rm_prepare_folders( params.decafFilesRemove ).join(';') );
	});


	//deciding whether to do sandbox and github pushes dependent on params set in the repo info.json file.
	grunt.registerTask( 'SandboxGithub', 'Do sandbox and github pushes?', function SandboxGithub() {
		var params = grunt.config.get( 'eeParams' );
		var msg = "";
		if ( params.sandboxsite !== null && typeof params.sandboxsite !== 'undefined' ) {
			grunt.task.run('shell:SandboxPull', 'setNotifications:shell:SandboxPull' );
			msg +=  '<%= eeParams.branch %> branch for <%= eeParams.name %> has been updated on <a href="http://<%= eeParams.sandboxUrl %>"><%= eeParams.sandboxUrl %></a>.<br>';
		}

		if ( params.sandboxdecafsite !== null && typeof params.sandboxsite !== 'undefined' ) {
			grunt.task.run( 'shell:decafSandboxPull', 'setNotifications:shell:decafSandboxPull' );
			msg += '<%= eeParams.branch %> branch has been updated for <%= eeParams.name %> on <a href="http://<%= eeParams.sandboxdecafUrl %>"><%= eeParams.sandboxdecafUrl %></a>.<br>';
		}

		if ( params.github ) {
			tagPush = grunt.config.get( 'tagPush' );
			if ( tagPush ) {
				grunt.task.run( 'shell:githubPushTags', 'setNotifications:shell:githubPushTags' );
			} else {
				grunt.task.run( 'shell:githubPush', 'setNotifications:shell:githubPush' );
			}
			msg += '<%= eeParams.branch %> branch for <%= eeParams.name %> has been pushed to github.<br>';
		}

		if ( msg !== "" ) {
			grunt.config.set('mainChatMessage', msg );
			grunt.config.set( 'mainChatColor', 'purple' );
			grunt.task.run( 'hipchat_notifier:notify_main_chat' );
		}
	});


	grunt.registerTask( 'maybeRun', 'Checks to see if grunt should run tasks basied on the last commit in the gitlog', function maybeRun() {
		var gitinfo = grunt.config.get( 'gitinfo' );
		if ( typeof gitinfo.local === 'undefined' ) {
			grunt.log.warn( 'git info did not appear to work. Needed to be able to complete tasks.' );
		}
		grunt.verbose.writeln( gitinfo.local.branch.current.lastCommitAuthor );
		var authorToCheck = 'EE DevBox Server';
		if ( gitinfo.local.branch.current.lastCommitAuthor.indexOf( authorToCheck ) > -1 ) {
			grunt.fail.warn( 'Will not continue tasks because last commit was the grunt commit!' );
		}
	});

	grunt.registerTask( 'setTagPush', 'Used to set the tagpush flag to true', function setTagPush() {
		grunt.config.set( 'tagPush', true );
	});

	grunt.registerTask( 'testinggitinfo', ['gitcheckout:alpha', 'gitinfo', 'maybeRun'] );

	grunt.registerTask( 'updateSandbox_master', [
		'gitcheckout:master',
		'gitpull:master',
		'gitinfo',
		'seteeParams',
		'SandboxGithub'
		]);

	grunt.registerTask( 'updateSandbox_alpha', [
		'gitcheckout:alpha',
		'gitpull:alpha',
		'gitinfo',
		'seteeParams',
		'SandboxGithub'
		]);

	grunt.registerTask( 'updateSandbox_beta', [
		'gitcheckout:beta',
		'gitpull:beta',
		'gitinfo',
		'seteeParams',
		'SandboxGithub'
		]);

	//bumping rc version
	grunt.registerTask( 'bumprc_master', [
		'setNotifications:init:bumprc_master:purple',
		'gitcheckout:master',
		'setNotifications:gitcheckout:master',
		'gitpull:master',
		'setNotifications:gitpull:master',
		'gitinfo',
		'seteeParams',
		'maybeRun',
		'shell:bump_rc',
		'setNotifications:shell:bump_rc',
		'gitadd:version',
		'setNotifications:gitadd:version',
		'gitcommit:version',
		'setNotifications:gitcommit:version',
		'gitpush:bump',
		'setNotifications:gitpush:bump',
		'setNotifications:end',
		'hipchat_notifier:notify_team'
		] );

	grunt.registerTask( 'bumprc_alpha', [
		'setNotifications:init:bumprc_alpha:purple',
		'gitcheckout:alpha',
		'setNotifications:gitcheckout:alpha',
		'gitpull:alpha',
		'setNotifications:gitpull:alpha',
		'gitinfo',
		'seteeParams',
		'maybeRun',
		'shell:bump_rc',
		'setNotifications:shell:bump_rc',
		'gitadd:version',
		'setNotifications:gitadd:version',
		'gitcommit:version',
		'setNotifications:gitcommit:version',
		'gitpush:bump_alpha',
		'setNotifications:gitpush:bump_alpha',
		'setNotifications:end',
		'hipchat_notifier:notify_team'
		] );


	grunt.registerTask( 'bumprc_beta', [
		'setNotifications:init:bumprc_beta:purple',
		'gitcheckout:beta',
		'setNotifications:gitcheckout:beta',
		'gitpull:beta',
		'setNotifications:gitpull:beta',
		'gitinfo',
		'seteeParams',
		'maybeRun',
		'shell:bump_rc',
		'setNotifications:shell:bump_rc',
		'gitadd:version',
		'setNotifications:gitadd:version',
		'gitcommit:version',
		'setNotifications:gitcommit:version',
		'gitpush:bump_beta',
		'setNotifications:gitpush:bump_beta',
		'setNotifications:end',
		'hipchat_notifier:notify_team'
		] );


	//bumping minor version and releasing hotfix
	grunt.registerTask( 'hotfix', [
		'setNotifications:init:hotfix:yellow',
		'gitcheckout:master',
		'setNotifications:gitcheckout:master',
		'gitpull:master',
		'setNotifications:gitpull:master',
		'gitinfo',
		'seteeParams',
		'shell:bump_minor',
		'setNotifications:shell:bump_minor',
		'gitadd:version',
		'setNotifications:gitadd:version',
		'gitcommit:release',
		'setNotifications:gitcommit:release',
		'gitcheckout:release',
		'setNotifications:gitcheckout:release',
		'gittag:releaseAll',
		'setNotifications:gittag:releaseAll',
		'shell:remove_folders_release',
		'setNotifications:shell:remove_folders_release',
		'gitadd:version',
		'setNotifications:gitadd:version',
		'gitcommit:release',
		'setNotifications:gitcommit:release',
		'gittag:release',
		'setNotifications:gittag:release',
		'gitarchive:release',
		'setNotifications:gitarchive:release',
		'gitcheckout:master',
		'setNotifications:gitcheckout:master',
		'shell:bump_rc',
		'setNotifications:shell:bump_rc',
		'gitadd:version',
		'setNotifications:gitadd:version',
		'gitcommit:version',
		'setNotifications:gitcommit:version',
		'gitpush:release',
		'setNotifications:gitpush:release',
		'setTagPush',
		'updateSandbox_master',
		'shell:shareBuild',
		'setNotifications:shell:shareBuild',
		'setNotifications:end',
		'hipchat_notifier:notify_team'
		] );


	//bumping major versions and releasing.
	grunt.registerTask( 'release', [
		'setNotifications:init:release:green',
		'gitcheckout:master',
		'setNotifications:gitcheckout:master',
		'gitpull:master',
		'setNotifications:gitpull:master',
		'gitinfo',
		'seteeParams',
		'shell:bump_major',
		'setNotifications:shell:bump_major',
		'gitadd:version',
		'setNotifications:gitadd:version',
		'gitcommit:release',
		'setNotifications:gitcommit:release',
		'gitcheckout:release',
		'setNotifications:gitcheckout:release',
		'gittag:releaseAll',
		'setNotifications:gittag:releaseAll',
		'shell:remove_folders_release',
		'setNotifications:shell:remove_folders_release',
		'gitadd:version',
		'gitcommit:release',
		'setNotifications:gitcommit:release',
		'gittag:release',
		'setNotifications:gittag:release',
		'gitarchive:release',
		'setNotifications:gitarchive:release',
		'gitcheckout:master',
		'setNotifications:gitcheckout:master',
		'shell:bump_rc',
		'setNotifications:shell:bump_rc',
		'gitadd:version',
		'gitcommit:version',
		'setNotifications:gitcommit:version',
		'gitpush:release',
		'setNotifications:gitpush:release',
		'setTagPush',
		'updateSandbox_master',
		'shell:shareBuild',
		'setNotifications:shell:shareBuild',
		'setNotifications:end',
		'hipchat_notifier:notify_team'
		] );



	//building pre-releases
	grunt.registerTask( 'pr_alpha', [
		'setNotifications:init:pr_alpha:green',
		'gitcheckout:alpha',
		'setNotifications:gitcheckout:alpha',
		'gitpull:alpha',
		'setNotifications:gitpull:alpha',
		'gitinfo',
		'seteeParams',
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
		'setNotifications:init:pr_beta:green',
		'gitcheckout:beta',
		'setNotifications:gitcheckout:beta',
		'gitpull:beta',
		'setNotifications:gitpull:beta',
		'gitinfo',
		'seteeParams',
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
	grunt.registerTask( 'pr', [
		'setNotifications:init:pr:green',
		'gitcheckout:master',
		'setNotifications:gitcheckout:master',
		'gitpull:master',
		'setNotifications:gitpull:master',
		'gitinfo',
		'seteeParams',
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


	//test build for micro minor versions.
	//bumping major versions and releasing.
	grunt.registerTask( 'microzip', [
		'setNotifications:init:microzip:yellow',
		'gitcheckout:master',
		'setNotifications:gitcheckout:master',
		'gitpull:master',
		'setNotifications:gitpull:master',
		'gitinfo',
		'seteeParams',
		'gitcheckout:release',
		'setNotifications:gitcheckout:release',
		'shell:microZipVersion',
		'setNotifications:shell:microZipVersion',
		'shell:remove_folders_release',
		'setNotifications:shell:remove_folders_release',
		'gitadd:version',
		'gitcommit:release',
		'setNotifications:gitcommit:release',
		'gitarchive:release',
		'setNotifications:gitarchive:release',
		'gitcheckout:master',
		'setNotifications:gitcheckout:master',
		'shell:shareBuild',
		'setNotifications:shell:shareBuild',
		'setNotifications:end',
		'hipchat_notifier:notify_team'
		] );

	//wporg builds
	grunt.registerTask( 'wpdeploy', [
		'setNotifications:init:wpdeploy:green',
		'gitcheckout:master',
		'setNotifications:gitcheckout:master',
		'gitpull:master',
		'setNotifications:gitpull:master',
		'gitinfo',
		'seteeParams',
		'shell:prepWPassets',
		'setNotifications:shell:prepWPassets',
		'shell:checkoutTag',
		'setNotifications:shell:checkoutTag',
		'shell:decafVersion',
		'setNotifications:shell:decafVersion',
		'shell:remove_folders_decaf',
		'setNotifications:shell:remove_folders_decaf',
		'shell:renameMainFile',
		'setNotifications:shell:renameMainFile',
		'shell:prepWPBuild',
		'setNotifications:shell:prepWPBuild',
		'gitadd:version',
		'gitcommit:releaseWP',
		'gitarchive:wpRelease',
		'setNotifications:gitarchive:wpRelease',
		'shell:shareBuildWP',
		'setNotifications:shell:shareBuildWP',
		'wp_deploy:deploy',
		'setNotifications:wp_deploy:deploy',
		'setNotifications:end',
		'hipchat_notifier:notify_team'
		]);

	grunt.registerTask( 'wpdeploy_ziponly', [
		'setNotifications:init:wpdeploy_ziponly:green',
		'gitcheckout:master',
		'setNotifications:gitcheckout:master',
		'gitpull:master',
		'setNotifications:gitpull:master',
		'gitinfo',
		'seteeParams',
		'shell:prepWPassets',
		'setNotifications:shell:prepWPassets',
		'shell:checkoutTag',
		'setNotifications:shell:checkoutTag',
		'shell:decafVersion',
		'setNotifications:shell:decafVersion',
		'shell:remove_folders_decaf',
		'setNotifications:shell:remove_folders_decaf',
		'shell:renameMainFile',
		'setNotifications:shell:renameMainFile',
		'shell:prepWPBuild',
		'setNotifications:shell:prepWPBuild',
		'gitadd:version',
		'gitcommit:releaseWP',
		'gitarchive:wpRelease',
		'setNotifications:gitarchive:wpRelease',
		'shell:shareBuildWP',
		'setNotifications:shell:shareBuildWP',
		'setNotifications:end',
		'hipchat_notifier:notify_team'
		]);


	//other testing things
	grunt.registerTask( 'testingcssmin', ['seteeParams', 'gitcheckout:testingSetup', 'cssmin:minify'] );
}
