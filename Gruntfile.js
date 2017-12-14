/**
 * Event Espresso packager.
 * To setup the following must be installed:
 * node.js
 * grunt-cli.
 *
 * Initial install
 * 1. Run "npm install" to make sure grunt and all its dependencies are installed
 *
 * Initial setup
 * 1. Create a file called buildmap.json (see example) that contains the map of all plugins added to the build machine
 *    (and their attached repos).  Whatever is mapped to "origin" is the master repo and authority source.  Other repos
 *    are what gets pushed to on builds (master branch only) (see buildmap.json.sample).
 * 2. Create  a file called private.json and add any authorization creds in there (see private.json.sample)
 * 3. Execute "grunt builder init" This will go through the build map and setup the src folder for all builds and the
 *    "all-builds" folder for the pots.
 * 4. Run "grunt hotfix {slug-of-build}" where {slug-of-build} corresponds to the name of the folder in `src` that you
 *    want to build for hotfixes.
 * 5. Use "grunt --help" for a list of all the commands you can use.
 *
 * Other
 * - you can run `grunt builder init` at any time to pick up new builds added to the map and get them initialized.
 *
 *
 * NOTE: This is still a work in progress and is by no means complete.  Use at your own risk!
 */

var builderInit = require('./src/init'),
    notifications = require('./src/notifications'),
    remoteSyncTasks = require('./src/remote-sync'),
    transform = require('./src/transform'),
    utils = require('./src/util'),
    shareBuildObject = {
        notify: 'Archive folder has been made available and can be retrieved from <a href="<%= privateParams.build_creds.archiveBaseUrl %>/<%= pluginParams.slug %>.zip">clicking here</a>.  Username: <%= privateParams.build_creds.archiveUser %>.  Password: <%= privateParams.build_creds.archivePass %>.',
        slacknotify: "Archive folder has been made available and can be retrieved from <%= privateParams.build_creds.archiveBaseUrl %>/<%= pluginParams.slug %>.zip.  *Username:* <%= privateParams.build_creds.archiveUser %>.  *Password:* <%= privateParams.build_creds.archivePass %>.",
        command: 'mv builds/<%= pluginParams.slug %>.zip <%= privateParams.build_creds.archiveBasePath %>'
    };


module.exports = function(grunt) {
    builderInit.setGrunt(grunt);
    notifications.setGrunt(grunt);
    remoteSyncTasks.setGrunt(grunt);
    transform.setGrunt(grunt);
    utils.setGrunt(grunt);

    var defaultPluginParams = {
        "versionFile" : "",
        "versionType" : "rc",
        "slug" : "",
        "textDomain" : "",
        "srcBuildFolderName" : "",
        "wpOrgSlug" : "",
        "wpOrgMainFileSlug" : "",
        "wpOrgUser" : "",
        "wpOrgRelease" : "",
        "awsbucket" : "",
        "awsregion" : "",
        "releaseFilesRemove" : [],
        "decafFilesRemove" : [],
        "branch" : "",
        "github" : false,
        "taskGroupName" : "",
        "compressPhpPath" : "",
        "jsBuildDirectory" : "",
        "remoteNamesToPushTo" : [] /* This should be an array of remote names in the src repo that can be pushed to in a task */
    };

    var defaultPrivateParams = {
        "build_creds" : {
            "archiveUser" : "",
            "archivePass" : "",
            "archiveBaseUrl" : "",
            "archiveBasePath" : ""
        },
        "slack_creds" : {
            "authToken" : "",
            "botToken" : "",
            "channels" : {
                "build" : "",
                "main" : ""
            }
        },
        "hipchat_creds" : {
            "authToken": "",
            "roomID" : ""
        },
        "aws_creds" : {
            "accessKeyId" : "",
            "secretAccessKey": ""
        }
    };


    var defaultBuildMap = [];

    //project config.
    grunt.initConfig({
        pkg: grunt.file.readJSON( 'package.json' ),
        pluginParams: defaultPluginParams,
        privateParams: grunt.file.exists('private.json') ? grunt.file.readJSON('private.json') : defaultPrivateParams,
        buildMap: grunt.file.exists('buildmap.json') ? grunt.file.readJSON('buildmap.json') : defaultBuildMap,
        currentSlug: '',
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
        taskGroupName: '',
        remoteSyncNotify: '',
        remoteSyncCommand: '',
        previousCommitMessage: '',

        //shell commands
        shell: {
            //compress php
            compress_php: {
                notify: 'Compress php file for dompdf',
                command: [
                    'cd buildsrc/<%= currentSlug %>/<%= pluginParams.compressPhpPath %>',
                    'find . -name \'*.php\' -type f -exec sh -c \'php -w "${0%.*}.php" > "${0%.*}.cphp"; rm "${0%.*}.php"; mv "${0%.*}.cphp" "${0%.*}.php"\' {} \\;'
                ].join('&&'),
                options: {
                    stdout: true,
                    stderr: false,
                    stdin: false
                }
            },
            //run any npm tasks
            npm_run: {
                notify: 'Ran build on js build directory.',
                command: [
                    'cd buildsrc/<%= currentSlug %>/<%= pluginParams.jsBuildDirectory %>',
                    'npm run build'
                ].join('&&'),
                options: {
                    stdout: true,
                    stderr: false,
                    stdin: false
                }
            },
            //bump dev version.
            bump_rc: {
                notify: 'Bump Version task completed.  Version bumped to <%= new_version %>',
                command: [
                    'export EE_VERSION_BUMP_TYPE="<%=pluginParams.versionType %>"',
                    'export EE_VERSION_FILE="buildsrc/<%= currentSlug %>/<%= pluginParams.versionFile %>"',
                    'export EE_INFO_JSON="buildsrc/<%= currentSlug %>/info.json"',
                    'php version-bump.php'
                ].join('&&'),
                options: {
                    callback: utils.setNewVersion,
                    stdout: true,
                    stderr: false,
                    stdin: false
                }
            },
            bump_minor: {
                notify: 'Bump Version task completed.  Version bumped to <%= new_version %>',
                command: [
                    'export EE_VERSION_BUMP_TYPE="minor"',
                    'export EE_VERSION_FILE="buildsrc/<%= currentSlug %>/<%= pluginParams.versionFile %>"',
                    'export EE_INFO_JSON="buildsrc/<%= currentSlug %>/info.json"',
                    'php version-bump.php'
                ].join('&&'),
                options: {
                    callback: utils.setNewVersion,
                    stdout: true,
                    stderr: false,
                    stdin: false
                }
            },
            bump_major: {
                notify: 'Bump Version task completed.  Version bumped to <%= new_version %>',
                command: [
                    'export EE_VERSION_BUMP_TYPE="major"',
                    'export EE_VERSION_FILE="buildsrc/<%= currentSlug %>/<%= pluginParams.versionFile %>"',
                    'export EE_INFO_JSON="buildsrc/<%= currentSlug %>/info.json"',
                    'php version-bump.php'
                ].join('&&'),
                options: {
                    callback: utils.setNewVersion,
                    stdout: true,
                    stderr: false,
                    stdin: false
                }
            },
            decafVersion: {
                notify: 'Decaf version task completed. Version changed to <%= new_version %>',
                command: [
                    'export EE_VERSION_BUMP_TYPE="decaf"',
                    'export EE_VERSION_FILE="buildsrc/<%= currentSlug %>/<%= pluginParams.versionFile %>"',
                    'export EE_README_FILE="buildsrc/<%= currentSlug %>/readme.txt"',
                    'export EE_INFO_JSON="buildsrc/<%= currentSlug %>/info.json"',
                    'php version-bump.php'
                ].join('&&'),
                options: {
                    callback: utils.setNewVersion,
                    stdout: true,
                    stderr: false,
                    stdin: false
                }
            },
            prVersion: {
                notify: 'Version changed for pr (adding beta prefix). Version changed to <%= new_version %>',
                command: [
                    'export EE_VERSION_BUMP_TYPE="pre_release"',
                    'export EE_VERSION_FILE="buildsrc/<%= currentSlug %>/<%= pluginParams.versionFile %>"',
                    'export EE_INFO_JSON="buildsrc/<%= currentSlug %>/info.json"',
                    'php version-bump.php'
                ].join('&&'),
                options: {
                    callback: utils.setNewVersion,
                    stdout: true,
                    stderr: false,
                    stdin: false
                }
            },
            microZipVersion: {
                notify: 'Version changed for microzip (bumping back and using p). Version changed to <%= new_version %>',
                command: [
                    'export EE_VERSION_BUMP_TYPE="micro_zip"',
                    'export EE_VERSION_FILE="buildsrc/<%= currentSlug %>/<%= pluginParams.versionFile %>"',
                    'export EE_INFO_JSON="buildsrc/<%= currentSlug %>/info.json"',
                    'php version-bump.php'
                ].join('&&'),
                options: {
                    callback: utils.setNewVersion,
                    stdout: true,
                    stderr: false,
                    stdin: false
                }
            },
            remove_folders_release: {
                notify: '<%= pluginParams.releaseFilesRemove.length %> folders and files removed in prep for release.',
                command: ''
            },
            remove_folders_decaf: {
                notify: '<%= pluginParams.releaseFilesRemove.length %> folders and files removed in prep for decaf release.',
                command: ''
            },
            checkoutTag: {
                notify: 'Checking out <%= pluginParams.wpOrgRelease %> version to be packaged for wordpress.org release.',
                command: [
                    'cd buildsrc/<%= currentSlug %>',
                    'git checkout <%= pluginParams.wpOrgRelease %> -B release_prep'
                ].join('&&')
            },
            checkoutwpbranch : {
                notify: 'Creating and checking out a release_prep branch for wp.org release.',
                command: [
                    'cd buildsrc/<%= currentSlug %>',
                    'git checkout -B release_prep'
                ].join('&&')
            },
            prepWPassets : {
                notify: 'Moving contents of wp-assets into correct directory.',
                command: [
                    'rm -rf wpbuilds/<%= currentSlug %>/wp-org-assets',
                    'mkdir -p wpbuilds/<%= currentSlug %>/wp-org-assets',
                    'cp -r buildsrc/<%= currentSlug %>/wp-assets/* wpbuilds/<%= currentSlug %>/wp-org-assets'
                ].join(';')
            },
            prepWPBuild : {
                notify: 'Copying contents of plugin into wp-org build directory to prep for deploy to wordpress.org.',
                command: [
                    'rm -rf wpbuilds/<%= currentSlug %>/wp-org',
                    'mkdir -p wpbuilds/<%= currentSlug %>/wp-org',
                    'cp -r buildsrc/<%= currentSlug %>/* wpbuilds/<%= currentSlug %>/wp-org',
                    'cd wpbuilds/<%= currentSlug %>/wp-org',
                    'find . -depth -name node_modules -type d -exec rm -r "{}" \\;'
                ].join(';')
            },
            renameMainFile : {
                notify: 'Renamed main file <em><%= pluginParams.versionFile %></em> to <em><%=pluginParams.wpOrgSlug %></em> to match the slug for the wordpress.org release.',
                slacknotify: "Renamed main file _<%= pluginParams.versionFile %>_ to _<%=pluginParams.wpOrgSlug %>_ to match the slug for the wordpress.org release.",
                command: 'mv builds/<%= currentSlug %>/<%= pluginParams.versionFile %> buildsrc/<%= currentSlug %>/<%= pluginParams.wpOrgSlug %>.php'
            },
            shareBuild : shareBuildObject,
            shareBuildpr : shareBuildObject,
            shareBuildWP : {
                notify: 'Archive folder for WP deploy has been made available and can be retrieved from <a href="<%= privateParams.build_creds.archiveBaseUrl %><%= pluginParams.wpOrgSlug %>-wp.zip">clicking here</a>.  Username: <%= privateParams.build_creds.archiveUser %>.  Password: <%= privateParams.build_creds.archivePass %>.',
                slacknotify: "Archive folder for WP deploy has been made available and can be retrieved from <%= privateParams.build_creds.archiveBaseUrl %><%= pluginParams.wpOrgSlug %>-wp.zip  *Username:* <%= privateParams.build_creds.archiveUser %>.  *Password:* <%= privateParams.build_creds.archivePass %>.",
                command: 'mv wpbuilds/<%= currentSlug %>/<%= pluginParams.wpOrgSlug %>-wp.zip <%= privateParams.build_creds.archiveBasePath %>'
            },
            sharePOTBuild : {
                notify: 'POT Build moved for retrieval.',
                command: 'mv potbuilds/languages/<%= pluginParams.textDomain %>.pot <%= privateParams.build_creds.archiveBasePath %>'
            },
            githubPushTags: {
                notify: "Pushed <%= pluginParams.branch %> branch to github repo along with all tags.",
                command: [
                    'cd buildsrc/<%= currentSlug %>',
                    'unset GIT_DIR',
                    'git push github <%= pluginParams.branch %>',
                    'git push github --tags'
                ].join('&&'),
                options: {
                    stdout: false,
                    stderr:false,
                    stdin: false
                }
            },
            githubPush: {
                notify: "Pushed <%= pluginParams.branch %> branch to github repo.",
                command: [
                    'cd buildsrc/<%= currentSlug %>',
                    'unset GIT_DIR',
                    'git push github <%= pluginParams.branch %>'
                ].join('&&'),
                options: {
                    stdout: false,
                    stderr:false,
                    stdin: false
                }
            },
            remoteSync: {
                notify: "<%= remoteSyncNotify %>",
                command: "<%= remoteSyncCommand %>",
                options: {
                    stdout: false,
                    stderr: false,
                    stdin: false
                }
            },
            githubSync: {
                notify: "Pushed <%= syncBranch %> branch to github repo.",
                command: [
                    'cd buildsrc/<%= currentSlug %>',
                    'unset GIT_DIR',
                    'git push github <%= syncBranch %>'
                ].join('&&'),
                options: {
                    stdout: false,
                    stderr:false,
                    stdin: false
                }
            },
            gitFetch : {
                notify: "Fetching remotes.",
                command: [
                    'cd buildsrc/<%= currentSlug %>',
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
                    'cd potbuilds/<%= currentSlug %>',
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
                cwd: 'buildsrc/<%= currentSlug %>'
            }
        },

        //git commands
        gitadd: {
            version: {
                notify: 'Staged changes for commit.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    all: true
                }
            }
        },

        gitreset: {
            clean: {
                notify: 'Reset to latest commit (HEAD).',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
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
                notify: 'Commited <%= pluginParams.versionType %> version bump.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    message: 'Bumping version to <%= new_version %>. Previous Commit message: <%= previousCommitMessage %>'
                }
            },
            //releasebump
            release: {
                notify: 'Commited release version bump.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    message: 'Bumping version to <%= new_version %> and prepped for release'
                }
            },

            releaseSansFiles: {
                notify: 'Commited release minus folders/files not included with production bump.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    message: 'Prepping release minus folders/files not included with production.'
                }
            },

            releaseWP: {
                notify: 'Commited WP Release.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    message: 'Prepping wp release minus folders/files not included with wp org releases.'
                }
            },

            prRelease: {
                notify: 'Commited release version change for pr.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    message: 'Changed version to <%= new_version %> and prepped for pre release'
                }
            }
        },

        gittag: {
            releaseAll: {
                notify: 'Tagged for <%= new_version %> with all files.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    tag: '<%= new_version %>',
                    message: 'Tagging for <%= new_version %> with all files.'
                }
            },
            release: {
                notify: 'Tagged for <%= new_version %> with all files except those not included with release.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    tag: '<%= new_version %>-sans-tests-tag',
                    message: 'Tagging for <%= new_version %> for production.'
                }
            }
        },

        gitcheckout: {

            release: {
                notify: 'Checking out release preparation branch.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    branch: 'release_prep',
                    overwrite: true
                }
            },

            master: {
                notify: 'Checking out master branch.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    branch: 'master'
                }
            },

            testingSetup: {
                notify: 'Checking out testing branch and ensuring its created and mirroring originating branch.  (This branch is used for non-destructive testing of grunt tasks).',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    branch: 'testing_auto_updates',
                    overwrite: true
                }
            },

            testing: {
                notify: 'Checking out testing branch.  (This branch is used for non-destructive testing of grunt tasks).',
                options: {
                    cwd : 'buildsrc/<%= currentSlug %>',
                    branch: 'testing_auto_updates'
                }
            },

            custom: {
                notify: 'Checking out <%= prBranch %>',
                options: {
                    cwd : 'buildsrc/<%= currentSlug %>',
                    branch : '<%= prBranch %>'
                }
            },

            sync: {
                notify: 'Checking out <%= syncBranch %>',
                options: {
                    cwd : 'buildsrc/<%= currentSlug %>',
                    branch : '<%= syncBranch %>'
                }
            }
        },

        gitpull: {
            master: {
                notify: 'Pulling master branch from remote (make sure all up to date!.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    branch: 'master'
                }
            },

            custom: {
                notify: 'Pulling <%= prBranch %> branch.',
                options: {
                    cwd : 'buildsrc/<%= currentSlug %>',
                    branch : '<%= prBranch %>'
                }
            },

            sync: {
                notify: 'Pulling <%= syncBranch %> branch.',
                options: {
                    cwd : 'buildsrc/<%= currentSlug %>',
                    branch : '<%= syncBranch %>'
                }
            }


        },

        gitpush: {
            release: {
                notify: 'Pushing master branch to remote along with all tags (for releases).',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    branch: 'master',
                    tags: true
                }
            },

            bump: {
                notify: 'Pushing master branch to remote.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    branch: 'master'
                }
            },

            testing: {
                notify: 'Pushing testing branch to remote (used for testing git grunt tasks non-destructively)',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    branch: 'testing_auto_updates',
                    tags: false
                }
            },

            custom: {
                notify: 'Pushing <%= prBranch %> to remote.',
                options: {
                    cwd : 'buildsrc/<%= currentSlug %>',
                    branch : '<%= prBranch %>'
                }
            }


        },

        gitarchive: {
            release: {
                notify: 'Archiving zip build for release.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    treeIsh: 'release_prep',
                    format: 'zip',
                    prefix: '<%= pluginParams.slug %>/',
                    output: '../../builds/<%= pluginParams.slug %>.zip'
                }
            },
            prRelease: {
                notify: 'Archiving zip build for pre release channel.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    treeIsh: 'release_prep',
                    format: 'zip',
                    prefix: '<%= pluginParams.slug %>/',
                    output: '../../builds/<%= pluginParams.slug %>.zip'
                }
            },
            wpRelease: {
                notify: 'Archiving zip build for wp org channel.',
                options: {
                    cwd: 'buildsrc/<%= currentSlug %>',
                    treeIsh: 'release_prep',
                    format: 'zip',
                    prefix: '<%= pluginParams.wpOrgSlug %>/',
                    output: '../../builds/<%= pluginParams.wpOrgSlug %>-wp.zip'
                }
            }
        },


        //awss3stuff
        aws_s3: {
            options: {
                accessKeyId: '<%= privateParams.aws_creds.accessKeyId %>',
                secretAccessKey: '<%= privateParams.aws_creds.secretAccessKey %>',
                region: '<%= pluginParams.awsregion %>',
                bucket: '<%= pluginParams.awsbucket %>'
            },

            release: {
                notify: 'Uploaded archive file to s3 account.',
                files: [{
                    cwd: 'builds/<%= currentSlug %>',
                    src: ['<%= pluginParams.slug %>.zip']
                }]
            }
        },

        hipchat_notifier : {
            options: {
                authToken: '<%= privateParams.hipchat_creds.authToken %>',
                roomId: '<%= privateParams.hipchat_creds.roomID %>'
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
                token : '<%= privateParams.slack_creds.authToken %>'
            },

            notify_build : {
                options : {
                    token: "<%= privateParams.slack_creds.botToken %>",
                    channel: '<%= privateParams.slack_creds.channels.build %>',
                    attachments: ['<%= slackNotificationMessage %>'],
                    username: 'EEBot',
                    icon_emoji: ':coffee:'
                }
            },

            notify_main : {
                options : {
                    token : '<%= privateParams.slack_creds.botToken %>',
                    channel : '<%= privateParams.slack_creds.channels.main %>',
                    attachments : [ '<%= mainChatSlackMessage %>' ],
                    username : 'EEBot',
                    icon_emoji : ':coffee:'
                }
            },

            change_topic : {
                options : {
                    token: '<%= privateParams.slack_creds.botToken %>',
                    channel: '<%= privateParams.slack_creds.channels.main %>',
                    text: '<%= slackTopic %>',
                    type: 'topic'
                }
            },

            get_topic_info : {
                options : {
                    type: 'getChannelInfo',
                    token : '<%= privateParams.slack_creds.botToken %>',
                    channel : '<%= privateParams.slack_creds.channels.main %>',
                    callback : notifications.postNewTopic
                }
            }
        },

        //css minification
        cssmin : {
            minify: {
                files: [{
                    expand: true,
                    cwd: 'buildsrc/<%= currentSlug %>',
                    src: ['*.css', '!*.min.css'],
                    dest: 'buildsrc/<%= currentSlug %>',
                    ext: '.min.css'
                }]
            }
        },


        //deploy to wordpress.org
        wp_deploy: {
            deploy: {
                notify: 'Deployed to WordPress.org!',
                options: {
                    plugin_slug: '<%= pluginParams.wpOrgSlug %>',
                    plugin_file_slug : '<%= pluginParams.wpOrgMainFileSlug %>',
                    svn_user: '<%= pluginParams.wpOrgUser %>',
                    build_dir: 'wpbuilds/<%= currentSlug %>/wp-org',
                    assets_dir: 'wpbuilds/<%= currentSlug %>/wp-org-assets',
                    checkout_dir: 'checkout/',
                    max_buffer: 1200*1024
                }
            }
        },

        makepot_notifications : {
            notify: 'Built POT File.  File is available by <a href="<%= privateParams.build_creds.archiveBaseUrl %>/<%= pluginParams.textDomain %>.pot">clicking here</a>  Username: <%= privateParams.build_creds.archiveUser %>.  Password: <%= privateParams.build_creds.archivePass %>.',
            slacknotify: "Built POT File.  File is available here: <%= privateParams.build_creds.archiveBaseUrl %>/<%= pluginParams.textDomain %>.pot  *Username:* <%= privateParams.build_creds.archiveUser %>.  *Password:* <%= privateParams.build_creds.archivePass %>."
        },

        makepot: {
            dopot : {
                options: {
                    cwd: 'potbuilds',
                    domainPath: 'languages/',
                    include: ['.*'],
                    potFilename: '<%= pluginParams.textDomain %>.pot',
                    potHeaders: {
                        poedit: true,
                        'x-poedit-keywordslist': true
                    }
                }
            }
        }
    });

    //load plugins providing the task.
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-git');
    grunt.loadNpmTasks('grunt-hipchat-notifier');
    grunt.loadNpmTasks('grunt-slack-api');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-gitinfo');
    grunt.loadNpmTasks('grunt-wp-deploy');
    grunt.loadNpmTasks('grunt-wp-i18n');


    grunt.registerTask( 'setNotifications', 'Testing what is available for custom grunt tasks', function () {
        notifications.setNotifications(this);
    });


    //delayed setting of pluginParams (want to set after initial checkout).
    grunt.registerTask( 'setPluginParams', 'Delayed setting of pluginParams after initial checkout so correct info.json file is read', function () {
        builderInit.setPluginParams(this);
    });

    //deciding whether to do a github push of the current set syncbranch dependent on params set in the repo info.json file.
    //this will also do any remote push as well.
    grunt.registerTask( 'GithubOnlyPush', 'Maybe push to github', function GithubOnlyPush() {
        remoteSyncTasks.githubOnlyPush(this);
    });

    grunt.registerTask( 'compressPhp', 'Maybe compress php files', function compressPhp() {
        transform.compressPhp();
    });

    //deciding whether to do sandbox and github pushes dependent on params set in the repo info.json file.
    grunt.registerTask( 'SandboxGithub', 'Do sandbox and github pushes?', function SandboxGithub() {
        remoteSyncTasks.allRemotesPush(this);
    });

    grunt.registerTask( 'maybeRun', 'Checks to see if grunt should run tasks based on the last commit in the gitlog', function maybeRun() {
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

    grunt.registerTask( 'maybeRunNpm', 'Used to determine whether to run the npm run buld task. Currently only runs if the jsBuildDirectory is set in the config.', function maybeRunNpm() {
        var params = grunt.config.get('pluginParams');
        grunt.verbose.writeln(params.jsBuildDirectory);
        if (params.jsBuildDirectory && params.jsBuildDirectory !== '' ) {
            grunt.task.run('shell:npm_run');
        }
    });

    /**
     * below are tasks that are typically used for running.
     * @todo need to move anything that isn't a task for running on its own into a protected js method instead.
     */

    grunt.registerTask(
        'testinggitinfo',
        'Testing gitinfo task and also verifies repo is setup for given plugin slug.',
        function (pluginSlug) {
            builderInit.initPluginSlug(pluginSlug);
            grunt.task.run(['gitcheckout:alpha', 'gitinfo', 'maybeRun']);
    });

    grunt.registerTask(
        'maybeRunNpmTest',
        'Testing Npm task.',
        function (pluginSlug) {
            builderInit.initPluginSlug(pluginSlug);
            grunt.task.run(['gitinfo','setPluginParams','maybeRunNpm']);
    });

    grunt.registerTask(
        'builder',
        'Main Builder tasks. Use "builder:init" for initializing the repositories from the buildmap.json file',
        function (command) {
            if (command === 'init') {
                builderInit.initializeFromMap()
            }
        }
    );

    grunt.registerTask(
        'updateRemotes',
        'Update all the remotes registered for the given plugin slug',
        function(pluginSlug) {
            builderInit.initPluginSlug(pluginSlug);
            grunt.task.run([
                'gitcheckout:master',
                'gitpull:master',
                'gitinfo',
                'setPluginParams',
                'SandboxGithub'
            ]);
    });

    //bumping rc version
    grunt.registerTask(
        'bumprc_master',
        'Bumping RC version on master for given plugin slug',
        function (pluginSlug) {
            builderInit.initPluginSlug(pluginSlug);
            grunt.task.run([
                'setNotifications:init:bumprc_master:purple',
                'gitcheckout:master',
                'setNotifications:gitcheckout:master',
                'gitpull:master',
                'setNotifications:gitpull:master',
                'gitinfo',
                'setPluginParams',
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
            ]);
        });

    grunt.registerTask(
        'hotfix',
        'bumping minor version and releasing hotfix',
        function (pluginSlug) {
            builderInit.initPluginSlug(pluginSlug);
            grunt.task.run([
                'setNotifications:init:hotfix:yellow',
                'gitcheckout:master',
                'setNotifications:gitcheckout:master',
                'gitpull:master',
                'setNotifications:gitpull:master',
                'gitinfo',
                'setPluginParams',
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
                'compressPhp',
                'maybeRunNpm',
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
                'updateRemotes',
                'shell:shareBuild',
                'setNotifications:shell:shareBuild',
                'shell:potCheckout',
                'setNotifications:shell:potCheckout',
                'setNotifications:end',
                'hipchat_notifier:notify_team',
                'slack_api:notify_build'
            ]);
        });



    grunt.registerTask(
        'release',
        'bumping major versions and releasing.',
        function (pluginSlug) {
            builderInit.initPluginSlug(pluginSlug);
            grunt.task.run([
                'setNotifications:init:release:green',
                'gitcheckout:master',
                'setNotifications:gitcheckout:master',
                'gitpull:master',
                'setNotifications:gitpull:master',
                'gitinfo',
                'setPluginParams',
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
                'compressPhp',
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
                'updateRemotes',
                'shell:shareBuild',
                'setNotifications:shell:shareBuild',
                'shell:potCheckout',
                'setNotifications:shell:potCheckout',
                'setNotifications:end',
                'hipchat_notifier:notify_team',
                'slack_api:notify_build'
            ]);
        });


    grunt.registerTask(
        'pr_custom',
        'A custom task for building pre-releases off of a named branch',
        function(pluginSlug, branch) {
            var gitBranch = typeof branch !== 'undefined' ? branch : grunt.config.get( 'prBranch' );
            builderInit.initPluginSlug(pluginSlug);
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
                'setPluginParams',
                'gitcheckout:release',
                'setNotifications:gitcheckout:release',
                'shell:prVersion',
                'setNotifications:shell:prVersion',
                'shell:remove_folders_release',
                'setNotifications:shell:remove_folders_release',
                'compressPhp',
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


    grunt.registerTask(
        'pr',
        'Do a pr build for a given plugin slug.',
        function (pluginSlug) {
            builderInit.initPluginSlug(pluginSlug);
            grunt.task.run([
                'setNotifications:init:pr:green',
                'gitcheckout:master',
                'setNotifications:gitcheckout:master',
                'gitpull:master',
                'setNotifications:gitpull:master',
                'gitinfo',
                'setPluginParams',
                'gitcheckout:release',
                'setNotifications:gitcheckout:release',
                'shell:prVersion',
                'setNotifications:shell:prVersion',
                'shell:remove_folders_release',
                'setNotifications:shell:remove_folders_release',
                'compressPhp',
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


    grunt.registerTask(
        'microzip',
        'For building a microzip interim release for testing.',
        function (pluginSlug) {
            builderInit.initPluginSlug(pluginSlug);
            grunt.task.run([
                'setNotifications:init:microzip:yellow',
                'gitcheckout:master',
                'setNotifications:gitcheckout:master',
                'gitpull:master',
                'setNotifications:gitpull:master',
                'gitinfo',
                'setPluginParams',
                'gitcheckout:release',
                'setNotifications:gitcheckout:release',
                'shell:microZipVersion',
                'setNotifications:shell:microZipVersion',
                'shell:remove_folders_release',
                'setNotifications:shell:remove_folders_release',
                'compressPhp',
                'maybeRunNpm',
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
            ]);
        });


    grunt.registerTask(
        'wpdeploy',
        'Deploy to wp.org',
        function (pluginSlug) {
            builderInit.initPluginSlug(pluginSlug);
            grunt.task.run([
                'setNotifications:init:wpdeploy:green',
                'gitcheckout:master',
                'setNotifications:gitcheckout:master',
                'gitpull:master',
                'setNotifications:gitpull:master',
                'gitinfo',
                'setPluginParams',
                'shell:prepWPassets',
                'setNotifications:shell:prepWPassets',
                'shell:checkoutTag',
                'setNotifications:shell:checkoutTag',
                'shell:decafVersion',
                'setNotifications:shell:decafVersion',
                'shell:remove_folders_decaf',
                'setNotifications:shell:remove_folders_decaf',
                'compressPhp',
                'maybeRunNpm',
                /*'shell:renameMainFile',
                 'setNotifications:shell:renameMainFile',/**/
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
        });


    grunt.registerTask(
        'wpdeploy_ziponly',
        'Same as wpdeploy except this does not actually send to wp.org but just builds a zip for testing.',
        function (pluginSlug) {
            builderInit.initPluginSlug(pluginSlug);
            grunt.task.run([
                'setNotifications:init:wpdeploy_ziponly:green',
                'gitcheckout:master',
                'setNotifications:gitcheckout:master',
                'gitpull:master',
                'setNotifications:gitpull:master',
                'gitinfo',
                'setPluginParams',
                'shell:prepWPassets',
                'setNotifications:shell:prepWPassets',
                'shell:checkoutTag',
                'setNotifications:shell:checkoutTag',
                'shell:decafVersion',
                'setNotifications:shell:decafVersion',
                'shell:remove_folders_decaf',
                'setNotifications:shell:remove_folders_decaf',
                'compressPhp',
                'maybeRunNpm',
                /*'shell:renameMainFile',
                 'setNotifications:shell:renameMainFile',/**/
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
        });


    //test css minifying.
    grunt.registerTask(
        'testingcssmin',
        function (pluginSlug) {
            builderInit.initPluginSlug(pluginSlug);
            grunt.task.run(['setPluginParams', 'gitcheckout:testingSetup', 'cssmin:minify']);
        });


    grunt.registerTask(
        'pot_only',
        'build pot file only',
        function (pluginSlug) {
            builderInit.initPluginSlug(pluginSlug);
            grunt.task.run([
                'setNotifications:init:pot_only:yellow',
                'gitcheckout:master',
                'setNotifications:gitcheckout:master',
                'gitpull:master',
                'gitinfo',
                'setPluginParams',
                'setNotifications:gitpull:master',
                'shell:potCheckout',
                'setNotifications:shell:potCheckout',
                'makepot',
                'setNotifications:makepot_notifications',
                'shell:sharePOTBuild',
                'setNotifications:shell:sharePOTBuild',
                'setNotifications:end',
                'hipchat_notifier:notify_team',
                'slack_api:notify_build'
            ])
        });

    grunt.registerTask(
        'githubsync',
        'A custom task for syncing named branches with github',
        function(pluginSlug, branch) {
            var gitBranch = typeof( branch ) !== 'undefined' ? branch : grunt.config.get( 'syncBranch' );
            builderInit.initPluginSlug(pluginSlug);
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
                'setPluginParams',
                'GithubOnlyPush',
                'setNotifications:end',
                'hipchat_notifier:notify_team',
                'slack_api:notify_build'
            ]);
    });
}
