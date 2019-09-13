/**
 * Module for notifications
 **/
var grunt = {},
notifications = {
    setGrunt: function( gruntObject ) {
        grunt = gruntObject;
    },
    postNewTopic: function( slackInfo ) {
        var newTopic = notifications.getTopicMessage(
            { topic: slackInfo.channel.topic.value }
        );

        notifications.slackPostTopic( newTopic );

        //SET new topic with slack
        grunt.config.set( 'slackTopic', newTopic );
    },
    getTopicMessage: function( roomInfo ) {
        var newTopic = roomInfo.topic,
            privateParams = grunt.config.get( 'privateParams' ),
            //let's parse and replace elements of the topic.
            versions = {
                rc: grunt.config.get( 'rc_version' ),
                minor: grunt.config.get( 'minor_version' ),
                major: grunt.config.get( 'major_version' ),
                versionType: grunt.config.get( 'pluginParams.versionType' )
            },
            versionMeta = {
                pre_release: privateParams.version_meta.pre_release,
                decaf: privateParams.version_meta.decaf,
                rc: privateParams.version_meta.rc,
                release: privateParams.version_meta.release
            },
            regEx = {
                release: versionMeta.release !== '' ?
                    new RegExp(
                        'REL:*.[0-9]+\\.[0-9]+\\.[0-9]+\\.' +
                        privateParams.version_meta.release
                    ) :
                    new RegExp( 'REL:*.[0-9]+\\.[0-9]+\\.[0-9]+' ),
                master: versionMeta.rc !== '' ?
                    new RegExp(
                        'MASTR:*.[0-9]+\\.[0-9]+\\.[0-9]+\\.' +
                        privateParams.version_meta.rc +
                        '\\.[0-9]{3}', 'g'
                    ) :
                    new RegExp(
                        'MASTR:*.[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]{3}',
                        'g'
                    )
            };
        grunt.verbose.writeln( 'Current Topic: ' + newTopic );
	    grunt.verbose.writeln( 'Versions: ' + JSON.stringify( versions ) );
        if ( versions.rc !== null ) {
            if ( versions.versionType === 'rc' ) {
                newTopic = newTopic.replace(
                    regEx.master,
                    'MASTR: ' + versions.rc
                );
            }
        }
        if ( versions.minor !== null ) {
            newTopic = newTopic.replace(
                regEx.release,
                'REL: ' + versions.minor
            );
        }

        if ( versions.major !== null ) {
            newTopic = newTopic.replace(
                regEx.release,
                'REL: ' + versions.major
            );
        }
	    grunt.verbose.writeln( 'New Topic: ' + newTopic );
	    return newTopic;
    },
    slackPostTopic: function( newTopic ) {
        grunt.config.set( 'slackTopic', newTopic );
        grunt.task.run( 'slack_api:change_topic' );
        notifications.slackNotifyTopicChanged();
    },
    slackNotifyTopicChanged: function() {
        var msg = grunt.config.get( 'slackNotificationMessage' );
        msg.text += "• Slack topic changed for #general.\n\n";
        msg.fields = [
            {
                "title": "Plugin",
                "value": grunt.config.get( 'pluginParams.slug' ),
                "short": true
            },
            {
                "title": "Task Run",
                "value": grunt.config.get( 'taskGroupName' ),
                "short": true
            }
        ];
        grunt.config.set( 'slackNotificationMessage', msg );
    },
    setNotifications: function( task ) {
        //grab what notification we're running.
        //grab message.
        var nameregex = new RegExp( task.name + '\\.', 'g' ),
            options_string = task.nameArgs.replace( /:/g, '.' ),
            task_name = options_string.replace( nameregex, '' ),
            task_notification = task_name + '.notify',
            slack_task_notification = task_name + '.slacknotify',
            msg = grunt.config.get( 'notificationMessage' ),
            slackmsg = grunt.config.get( 'slackNotificationMessage' ),
            privateParams = grunt.config.get( 'privateParams' ),
            slackCreds = privateParams.slack_creds || {};

        if ( task.args[ 0 ] === 'init' ) {
            msg = '<b>GruntBOT activity Report for:</b><br>';
            msg += 'Task Group Run: <b>' + task.args[ 1 ] + '</b><br><br>';
            msg += 'Notification Messages:<br>';
            msg += '<ul>';

            grunt.config.set( 'taskGroupName', task.args[ 1 ] );

            slackmsg.fallback = 'Grunt performed some tasks on the server';
            slackmsg.pretext = "Here are all the tasks completed";
            slackmsg.title = "GruntBOT activity report";
            slackmsg.mrkdwn_in = [ "text", "pretext" ];
            slackmsg.text = "";

            grunt.config.set( 'notificationMessage', msg );
            grunt.config.set( 'slackNotificationMessage', slackmsg );
            grunt.log.ok(
                'Messages initialized for notifications successfully.' );

            grunt.verbose.writeln( task.args );

            //set background color for chat client:
            if ( typeof task.args[ 2 ] !==
                'undefined' &&
                task.args[ 2 ] !==
                null ) {
                grunt.config.set( 'notificationColor', task.args[ 2 ] );
                slackmsg.color = task.args[ 2 ];
            }

            switch ( task.args[ 1 ] ) {
                case 'pr_custom' :
                case 'pr' :
                    grunt.config.set( 'preReleaseBuild', true );
                    break;
                case 'microzip' :
                    grunt.config.set( 'microZipBuild', true );
                    break;
            }

            return true;
        } else if ( task.args[ 0 ] === 'end' ) {
            /**
             * Grab topic from slack.
             */
            if (
                grunt.config.get( 'pluginParams.slug' ) ===
                    grunt.config.get( 'privateParams.parentPluginSlug' ) &&
                grunt.config.get( 'microZipBuild' ) !== true &&
                grunt.config.get( 'preReleaseBuild' ) !== true &&
                grunt.config.get( 'syncBranch' ) === 'master' &&
                slackCreds.authToken &&
                slackCreds.botToken &&
                slackCreds.channels
            ) {
                grunt.task.run( 'slack_api:get_topic_info' );
            } else {
                msg += '</ul>';
                msg += '<br><strong>The notifications above are for ' +
                    grunt.config.get( 'pluginParams.slug' ) +
                    '.</strong>';

                slackmsg.fields = [
                    {
                        "title": "Plugin",
                        "value": grunt.config.get( 'pluginParams.slug' ),
                        "short": true
                    },
                    {
                        "title": "Task Run",
                        "value": grunt.config.get( 'taskGroupName' ),
                        "short": true
                    }
                ];
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

            var slack_notification_message = grunt.config.get(
                slack_task_notification
            );
            slack_notification_message = slack_notification_message === null ||
                typeof slack_notification_message === 'undefined'
                    ? notification_message
                    : slack_notification_message;

            msg += '<li>' + notification_message + '</li>';
            slackmsg.text += "• " + slack_notification_message + "\n";
            grunt.verbose.ok( notification_message );
            grunt.config.set( 'notificationMessage', msg );
            grunt.config.set( 'slackNotificationMessage', slackmsg );
        }
        return true;
    }
};
module.exports = notifications;
