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
			cb();
		}/**/
	}

	function rm_prepare_folders( folders_to_remove ) {
		var folders = [];
		if ( typeof folders_to_remove === 'undefined' ) {
			return folders;
		}
		for ( var i = 0; i < folders_to_remove.length; i++ ) {
			folders[i] = 'rm -rf ' + folders_to_remove[i];
		}
		return folders;
	}

	var defaultParams = {
		"versionFile" : "",
		"versionType" : "rc",
		"slug" : "",
		"textDomain" : "",
		"srcBuildFolderName" : "",
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
		"github" : false,
		"demoee" : false
	};

	var defaultaws = {
		"accessKeyId" : "",
		"secretAccessKey" : ""
	};

	var defaulthipchat = {
		"authToken" : "",
		"roomID" : ""
	};

    /**
     *
     * @type {{authToken: string, channels: {}}}
     *
     * Channels should be object indexed by a reference and value is channel in slack
     * "channels" : {
     *      build : '#general'
     * }
     */
    var defaultSlack = {
        "authToken" : "",
        "channels" : {}
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
        slack: grunt.file.exists( 'slack.json' ) ? grunt.file.readJSON( 'slack.json' ) : defaultslack,
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
        slackNotificationMessage: {},
		mainChatMessage: '',
        mainChatSlackMessage : '',
        slackTopic : '',
		mainChatColor: 'purple',
		notificationColor: 'purple',
		tagPush: false,
		prBranch: 'master',
        syncBranch: 'master',

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
				command: ''
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
				slacknotify: "Renamed main file _<%= eeParams.versionFile %>_ to _<%=eeParams.wpOrgSlug %>_ to match the slug for the wordpress.org release.",
                command: 'mv src/<%= eeParams.versionFile %> src/<%= eeParams.wpOrgSlug %>.php'
			},
			shareBuild : {
				notify: 'Archive folder has been made available and can be retrieved from <a href="<%= eeParams.archiveBaseUrl %><%= eeParams.slug %>.zip">clicking here</a>.  Username: <%= privateParams.archiveUser %>.  Password: <%= privateParams.archivePass %>.',
                slacknotify: "Archive folder has been made available and can be retrieved from <%= eeParams.archiveBaseUrl %><%= eeParams.slug %>.zip.  *Username:* <%= privateParams.archiveUser %>.  *Password:* <%= privateParams.archivePass %>.",
				command: 'mv build/<%= eeParams.slug %>.zip <%= eeParams.archiveBasePath %>'
			},
			shareBuildpr : {
				notify: 'Archive folder has been made available and can be retrieved from <a href="<%= eeParams.archiveBaseUrl %><%= eeParams.slug %>.zip">clicking here</a>.  Username: <%= privateParams.archiveUser %>.  Password: <%= privateParams.archivePass %>.',
                slacknotify: "Archive folder has been made available and can be retrieved from <%= eeParams.archiveBaseUrl %><%= eeParams.slug %>.zip  *Username:* <%= privateParams.archiveUser %>.  *Password:* <%= privateParams.archivePass %>.",
				command: 'mv build/<%= eeParams.slug %>.zip <%= eeParams.archiveBasePath %>'
			},
			shareBuildWP : {
				notify: 'Archive folder for WP deploy has been made available and can be retrieved from <a href="<%= eeParams.archiveBaseUrl %><%= eeParams.wpOrgSlug %>-wp.zip">clicking here</a>.  Username: <%= privateParams.archiveUser %>.  Password: <%= privateParams.archivePass %>.',
                slacknotify: "Archive folder for WP deploy has been made available and can be retrieved from <%= eeParams.archiveBaseUrl %><%= eeParams.wpOrgSlug %>-wp.zip  *Username:* <%= privateParams.archiveUser %>.  *Password:* <%= privateParams.archivePass %>.",
				command: 'mv build/<%= eeParams.wpOrgSlug %>-wp.zip <%= eeParams.archiveBasePath %>'
			},
			sharePOTBuild : {
				notify: 'POT Build moved for retrieval.',
				command: 'mv ~/buildmachine/all_builds/src/languages/<%= eeParams.textDomain %>.pot <%= eeParams.archiveBasePath %>'
			},
			SandboxPull: {
				notify: 'Pulled <%= eeParams.branch %> branch to <a href="http://<%= eeParams.sandboxUrl %>"><%= eeParams.sandboxUrl %></a>',
                slacknotify: "Pulled <%= eeParams.branch %> branch to http://<%= eeParams.sandboxUrl %>",
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
                slacknotify: "Pulled <%= eeParams.branch %> branch to http://<%= eeParams.sandboxUrl %>.",
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
			},
            githubSync: {
                notify: "Pushed <%= syncBranch %> branch to github repo.",
                command: [
                    'cd src',
                    'unset GIT_DIR',
                    'git push github <%= syncBranch %>'
                ].join('&&'),
                options: {
                    stdout: false,
                    stderr:false,
                    stdin: false
                }
            },
			demoeePush: {
				notify: "Pushed <%= eeParams.branch %> branch to demoee repo.",
				command: [
					'cd src',
					'unset GIT_DIR',
					'git push demoee <%= eeParams.branch %>'
				].join('&&'),
				options: {
					stdout: false,
					stderr: false,
					stdin: false
				}
			},
			gitFetch : {
				notify: "Fetching remotes.",
				command: [
					'cd src',
					'unset GIT_DIR',
					'git fetch origin'
				].join('&&'),
				options: {
					stdout: false,
					stderr: false,
					stdin: false
				}
			},
			potCheckout: {
				notify: "Checking out master in the pot assembly directory",
				command: [
					'cd ~/buildmachine/all_builds/src/<%= eeParams.srcBuildFolderName %>',
					'unset GIT_DIR',
					'git checkout master',
					'git pull origin master'
				].join('&&'),
				options: {
					stdout: false,
					stderr: false,
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

		gitfetch: {
			custom: {
				notify: 'Fetching all remotes.',
				options : {
					repository: 'origin'
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
				}
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
					branch: 'testing_auto_updates'
				}
			},

			custom: {
				notify: 'Checking out <%= prBranch %>',
				options: {
					cwd : 'src',
					branch : '<%= prBranch %>'
				}
			},

            sync: {
                notify: 'Checking out <%= syncBranch %>',
                options: {
                    cwd : 'src',
                    branch : '<%= syncBranch %>'
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

			custom: {
				notify: 'Pulling <%= prBranch %> branch.',
				options: {
					cwd : 'src',
					branch : '<%= prBranch %>'
				}
			},

            sync: {
                notify: 'Pulling <%= syncBranch %> branch.',
                options: {
                    cwd : 'src',
                    branch : '<%= syncBranch %>'
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
			},

			custom: {
				notify: 'Pushing <%= prBranch %> to remote.',
				options: {
					cwd : 'src',
					branch : '<%= prBranch %>'
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


        slack_api : {
            options : {
                token : '<%= slack.authToken %>'
            },

            notify_build : {
                options : {
                    channel: '<%= slack.channels.build %>',
                    attachments: ['<%= slackNotificationMessage %>'],
                    username: 'EEBot',
                    icon_emoji: ':coffee:'
                }
            },

            notify_main : {
                options : {
                    channel : '<%= slack.channels.main %>',
                    text : '<%= mainChatSlackMessage %>',
                    username : 'EEBot',
                    icon_emoji : ':coffee:'
                }
            },

            change_topic : {
                options : {
                    channel: '<%= slack.channels.main =>',
                    text: '<%= slackTopic =>',
                    type: 'topic'
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
					assets_dir: 'build/wp-org-assets',
					max_buffer: 600*1024
				}
			}
		},


		makepot: {
			notify: 'Built POT File.  File is available by <a href="<%= eeParams.archiveBaseUrl %><%= eeParams.textDomain %>.pot">clicking here</a>  Username: <%= privateParams.archiveUser %>.  Password: <%= privateParams.archivePass %>.',
            slacknotify: "Built POT File.  File is available here: <%= eeParams.archiveBaseUrl %><%= eeParams.textDomain %>.pot  *Username:* <%= privateParams.archiveUser %>.  *Password:* <%= privateParams.archivePass %>.",
			options: {
				cwd: '../all_builds/src',
				domainPath: 'languages/',
				include: ['.*'],
				potFilename: '<%= eeParams.textDomain %>.pot',
				potHeaders: {
					poedit: true,
					'x-poedit-keywordslist' : true
				}
			}
		}
	});

	//load plugins providing the task.
	grunt.loadNpmTasks( 'grunt-shell' );
	grunt.loadNpmTasks( 'grunt-git' );
	grunt.loadNpmTasks('grunt-hipchat-notifier');
    grunt.loadNpmTasks( 'grunt-slack-api' );
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-gitinfo');
	grunt.loadNpmTasks('grunt-wp-deploy');
	grunt.loadNpmTasks('grunt-wp-i18n');

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
		};
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

        //SET new topic with slack
        grunt.config.set( 'slackTopic', currentTopic );


		//SET new topic with hipchat
		hipchat.api.rooms.topic( { room_id: roomID, topic: currentTopic, from: 'gruntBOT' }, function( err, res ) {
			if ( err ) { throw err; }
			grunt.log.ok( 'Topic changed for hipchat' );
			var msg = grunt.config.get( 'notificationMessage' );
            var slackmsg = grunt.config.get( 'slackNotificationMessage' );

			msg += '<li>HipChat topic changed for Main Chat room.</li>';
			msg += '</ul>';
			msg += '<br><strong>The notifications above are for ' + grunt.config.get( 'eeParams.slug' ) + '.</strong>';

            slackmsg.text += "• Hipchat topic changed for Main Chat room.\n\n";
            slackmsg.text += "*The notifications above are for " + grunt.config.get( 'eeParams.slug' ) + '.*';
			grunt.config.set( 'notificationMessage', msg );
            grunt.config.set( 'slackNotificationMessage', slackmsg );
			done();
		} );
	}

	grunt.registerTask( 'setNotifications', 'Testing what is available for custom grunt tasks', function setNotifications() {
		//grab what notification we're running.
		//grab message.
		var nameregex = new RegExp( this.name + '\\.', 'g' );
		var options_string = this.nameArgs.replace(/:/g, '.');
		var task_name = options_string.replace(nameregex, '');
		var task_notification = task_name + '.notify';
        var slack_task_notification = task_name + '.slacknotify';
		var msg = grunt.config.get( 'notificationMessage' );
        var slackmsg = grunt.config.get( 'slackNotificationMessage' );

		if ( this.args[0] == 'init' ) {
			msg = '<b>GruntBOT activity Report for:</b><br>';
			msg += 'Task Group Run: <b>' + this.args[1] + '</b><br><br>';
			msg += 'Notification Messages:<br>';
			msg += '<ul>';

            slackmsg.fallback = 'Grunt performed some tasks on the server';
            slackmsg.pretext = "Here are all the tasks completed";
            slackmsg.title = "GruntBOT activity report for *" + this.args[1] + "*";
            slackmsg.text = "*Notification  messages:*\n\n";

			grunt.config.set( 'notificationMessage', msg );
            grunt.config.set( 'slackNotificationMessage', slackmsg );
			grunt.log.ok( 'Messages initialized for notifications successfully.' );

			grunt.verbose.writeln( console.log(this.args) );

			//set background color for chat client:
			if ( typeof this.args[2] !== 'undefined' && this.args[2] !== null ) {
				grunt.config.set( 'notificationColor', this.args[2] );
                slackmsg.color = this.args[2];
			}

			switch ( this.args[1] ) {
				case 'pr_custom' :
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
			if ( grunt.config.get( 'eeParams.slug' ) == 'event-espresso-core-reg' && grunt.config.get( 'microZipBuild' ) !== true && grunt.config.get( 'preReleaseBuild' ) !== true && grunt.config.get(  'syncBranch' ) == 'master' ) {
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
                        grunt.task.run( 'slack_api:change_topic' );
					});

				} catch(e) {
					grunt.verbose.or.write('error with posting topic').error().error(e.message );
					msg += '</ul>';
					msg += '<br><strong>The notifications above are for ' + grunt.config.get( 'eeParams.slug' ) + '.</strong>';

                    slackmsg.text += "/n/n";
                    slackmsg.text += "*The notifications above are for " + grunt.config.get( 'eeParams.slug' ) + ".*";
					grunt.config.set( 'notificationMessage', msg );
                    grunt.config.set( 'slackNotificationMessage', slackmsg );
					return;
				}
			} else {
				msg += '</ul>';
				msg += '<br><strong>The notifications above are for ' + grunt.config.get( 'eeParams.slug' ) + '.</strong>';

                slackmsg.text += "/n/n";
                slackmsg.text += "*The notifications above are for " + grunt.config.get( 'eeParams.slug' ) + ".*";
				grunt.config.set( 'notificationMessage', msg );
                grunt.config.set( 'slackNotificationMessage', slackmsg );
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

            var slack_notification_message = grunt.config.get( slack_task_notification );
            slack_notification_message = slack_notification_message === null || typeof slack_notification_message === 'undefined' ? notification_message : slack_notification_message;

			msg += '<li>' + notification_message + '</li>';
            slackmsg.text += "• " + slack_notification_message + "\n\n";
			grunt.verbose.ok( notification_message );
			grunt.config.set( 'notificationMessage', msg );
            grunt.config.set( 'slackNotificationMessage', slackmsg );
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

		if ( params.sites !== null && typeof params.sites !== 'undefined' && ! grunt.config.get( 'preReleaseBuild' ) && params.branch == 'master' ) {
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


    //deciding whether to do a github push of the current set syncbranch dependent on params set in the repo info.json file.
    grunt.registerTask( 'GithubOnlyPush', 'Maybe push to github', function GithubOnlyPush() {
        var params = grunt.config.get( 'eeParams' );
        var msg = slackmsg = "";

        if ( params.github ) {
                grunt.task.run( 'shell:githubSync', 'setNotifications:shell:githubSync' );

            msg += '<%= syncBranch %> branch for <%= eeParams.name %> has been pushed to github.<br>';
            slackmsg += "<%= syncBranch %> branch for <%= eeParams.name %> has been pushed to github.\n";
        }

        if ( msg !== "" ) {
            grunt.config.set('mainChatMessage', msg );
            grunt.config.set('mainChatSlackMessage', slackmsg );
            grunt.config.set( 'mainChatColor', 'purple' );
            grunt.task.run( 'hipchat_notifier:notify_main_chat' );
            grunt.task.run( 'slack_api:notify_main' );
        }
    });

	//deciding whether to do sandbox and github pushes dependent on params set in the repo info.json file.
	grunt.registerTask( 'SandboxGithub', 'Do sandbox and github pushes?', function SandboxGithub() {
		var params = grunt.config.get( 'eeParams' );
		var msg = "", slackmsg = "", tagPush = false;
		if ( params.sandboxsite !== null && typeof params.sandboxsite !== 'undefined' ) {
			grunt.task.run('shell:SandboxPull', 'setNotifications:shell:SandboxPull' );
			msg +=  '<%= eeParams.branch %> branch for <%= eeParams.name %> has been updated on <a href="http://<%= eeParams.sandboxUrl %>"><%= eeParams.sandboxUrl %></a>.<br>';
            slackmsg += "<%= eeParams.branch %> branch for <%= eeParams.name %> has been updated on <%= eeParams.sandboxUrl %>\n";
		}

		if ( params.sandboxdecafsite !== null && typeof params.sandboxsite !== 'undefined' ) {
			grunt.task.run( 'shell:decafSandboxPull', 'setNotifications:shell:decafSandboxPull' );
			msg += '<%= eeParams.branch %> branch has been updated for <%= eeParams.name %> on <a href="http://<%= eeParams.sandboxdecafUrl %>"><%= eeParams.sandboxdecafUrl %></a>.<br>';
            slackmsg += "<%= eeParams.branch %> branch has been updated for <%= eeParams.name %> on http://<%= eeParams.sandboxdecafUrl %>.\n";
		}

		if ( params.github ) {
			tagPush = grunt.config.get( 'tagPush' );
			if ( tagPush ) {
				grunt.task.run( 'shell:githubPushTags', 'setNotifications:shell:githubPushTags' );
			} else {
				grunt.task.run( 'shell:githubPush', 'setNotifications:shell:githubPush' );
			}
			msg += '<%= eeParams.branch %> branch for <%= eeParams.name %> has been pushed to github.<br>';
            slackmsg += "<%= eeParams.branch %> branch for <%= eeParams.name %> has been pushed to github.\n";
		}

		if ( params.demoee ) {
			grunt.task.run( 'shell:demoeePush', 'setNotifications:shell:demoeePush' );
			msg += '<%= eeParams.branch %> branch for <%= eeParams.name %> has been pushed to demoee.org.<br>';
            slackmsg += "<%= eeParams.branch %> branch for <%= eeParams.name %> has been pushed to demoee.org.\n";
		}

		if ( msg !== "" ) {
			grunt.config.set('mainChatMessage', msg );
            grunt.config.set( 'mainChatSlackMessage', slackmsg );
			grunt.config.set( 'mainChatColor', 'purple' );
			grunt.task.run( 'hipchat_notifier:notify_main_chat' );
            grunt.task.run( 'slack_api:notify_main' );
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
		'hipchat_notifier:notify_team',
        'slack_api:notify_build'
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
		'shell:potCheckout',
		'setNotifications:shell:potCheckout',
		'makepot',
		'setNotifications:makepot',
		'shell:sharePOTBuild',
		'setNotifications:shell:sharePOTBuild',
		'setNotifications:end',
		'hipchat_notifier:notify_team',
        'slack_api:notify_build'
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
		'shell:potCheckout',
		'setNotifications:shell:potCheckout',
		'makepot',
		'setNotifications:makepot',
		'shell:sharePOTBuild',
		'setNotifications:shell:sharePOTBuild',
		'setNotifications:end',
		'hipchat_notifier:notify_team',
        'slack_api:notify_build'
		] );


	grunt.registerTask( 'pr_custom', 'A custom task for building pre-releases off of a named branch', function( branch ) {
		var gitBranch = typeof( branch ) !== 'undefined' ? branch : grunt.config.get( 'prBranch' );
		grunt.config.set( 'prBranch', gitBranch );

		grunt.log.writeln('GitBranch set is: ' + gitBranch );

		grunt.task.run([
			'setNotifications:init:pr_custom:green',
			'shell:gitFetch',
			'setNotifications:shell:gitFetch',
			'gitcheckout:custom',
			'setNotifications:gitcheckout:custom',
			'gitpull:custom',
			'setNotifications:gitpull:custom',
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
			'hipchat_notifier:notify_team',
            'slack_api:notify_build'
			]);

	});


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
		'hipchat_notifier:notify_team',
        'slack_api:notify_build'
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
		'hipchat_notifier:notify_team',
        'slack_api:notify_build'
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
		'hipchat_notifier:notify_team',
        'slack_api:notify_build'
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
		'hipchat_notifier:notify_team',
        'slack_api:notify_build'
		]);


	//other testing things
	grunt.registerTask( 'testingcssmin', ['seteeParams', 'gitcheckout:testingSetup', 'cssmin:minify'] );


	//build just the pot file.
	grunt.registerTask( 'pot_only', [
		'setNotifications:init:pot_only:yellow',
		'gitcheckout:master',
		'setNotifications:gitcheckout:master',
		'gitpull:master',
		'gitinfo',
		'seteeParams',
		'setNotifications:gitpull:master',
		'shell:potCheckout',
		'setNotifications:shell:potCheckout',
		'makepot',
		'setNotifications:makepot',
		'shell:sharePOTBuild',
		'setNotifications:shell:sharePOTBuild',
		'setNotifications:end',
		'hipchat_notifier:notify_team',
        'slack_api:notify_build'
		]);

    //just sync incoming branch with github
    grunt.registerTask( 'githubsync', 'A custom task for syncing named branches with github', function( branch ) {
    var gitBranch = typeof( branch ) !== 'undefined' ? branch : grunt.config.get( 'syncBranch' );
        grunt.config.set( 'syncBranch', gitBranch );
        grunt.log.writeln( 'GitBranch set is: ' + gitBranch );

        grunt.task.run([
            'setNotifications:init:githubsync:green',
            'shell:gitFetch',
            'setNotifications:shell:gitFetch',
            'gitcheckout:sync',
            'setNotifications:gitcheckout:sync',
            'gitpull:sync',
            'setNotifications:gitpull:sync',
            'gitinfo',
            'seteeParams',
            'GithubOnlyPush',
            'setNotifications:end',
            'hipchat_notifier:notify_team',
            'slack_api:notify_build'
        ]);
    });

}
