/**
 * Module for notifications
 **/
var HipChatClient = require('hipchat-client'),
    grunt = {},
    notifications = {
        hip_client: HipChatClient,
        setGrunt : function (gruntObject) {
            grunt = gruntObject;
        },
        getHipChatRoomInfo: function (slackInfo) {
            return {
                id: grunt.config.get('privateParams.hipchat_creds.roomID'),
                topic: slackInfo.channel.topic.value
            };
        },
        postNewTopic: function (slackInfo) {
            var roomInfo = notifications.getHipChatRoomInfo(slackInfo),
                newTopic = notifications.getTopicMessage(roomInfo);
            grunt.verbose.writeln(console.log(roomInfo));

            notifications.slackPostTopic(newTopic);
            notifications.hipChatPostTopic(roomInfo, newTopic);

            //SET new topic with slack
            grunt.config.set('slackTopic', newTopic);
        },
        getTopicMessage: function (roomInfo) {
            var newTopic = roomInfo.topic,
                //let's parse and replace elements of the topic.
                versions = {
                    rc: grunt.config.get('rc_version'),
                    minor: grunt.config.get('minor_version'),
                    major: grunt.config.get('major_version'),
                    versionType: grunt.config.get('pluginParams.versionType')
                };
            grunt.verbose.writeln(console.log(newTopic));
            if (versions.rc !== null) {
                if (versions.versionType === 'rc') {
                    newTopic = newTopic.replace(/MASTR:*.[0-9]\.[0-9]\.[0-9]+\.rc\.[0-9]{3}/g, 'MASTR: ' + versions.rc);
                } else if (versions.versionType === 'alpha') {
                    newTopic = newTopic.replace(/ALPHA:*.[0-9]\.[0-9]\.[0-9]+\.alpha\.[0-9]{3}/g, 'ALPHA: ' + versions.rc);
                } else if (versions.versionType === 'beta') {
                    newTopic = newTopic.replace(/BETA:*.[0-9]\.[0-9]\.[0-9]+\.beta\.[0-9]{3}/g, 'BETA: ' + versions.rc);
                }
            }
            if (versions.minor !== null) {
                newTopic = newTopic.replace(/REL:*.[0-9]\.[0-9]\.[0-9]+\.p/, 'REL: ' + versions.minor);
            }

            if (versions.major !== null) {
                newTopic = newTopic.replace(/REL:*.[0-9]\.[0-9]\.[0-9]+\.p/, 'REL: ' + versions.major);
            }
            return newTopic;
        },
        hipChatPostTopic: function (roomInfo, newTopic) {
            var authToken = grunt.config.get('hipchat_notifier.options.authToken'),
                hipchat_client = notifications.hip_client,
                hipchat = new hipchat_client(authToken);
            //SET new topic with hipchat
            hipchat.api.rooms.topic(
                {
                    room_id: roomInfo.id,
                    topic: newTopic || roomInfo.topic,
                    from: 'gruntBOT'
                },
                function (err, res) {
                    if (err) {
                        throw err;
                    }
                    grunt.log.ok('Topic changed for hipchat');
                    notifications.hipChatNotifyTopicChanged();
                });
        },
        slackPostTopic: function (newTopic) {
            grunt.config.set('slackTopic', newTopic);
            grunt.task.run('slack_api:change_topic');
            notifications.slackNotifyTopicChanged();
        },
        slackNotifyTopicChanged: function () {
            var msg = grunt.config.get('slackNotificationMessage');
            msg.text += "• Slack topic changed for #general.\n\n";
            msg.fields = [
                {
                    "title": "Plugin",
                    "value": grunt.config.get('pluginParams.slug'),
                    "short": true
                },
                {
                    "title": "Task Run",
                    "value": grunt.config.get('taskGroupName'),
                    "short": true
                }
            ];
            grunt.config.set('slackNotificationMessage', msg);
        },
        hipChatNotifyTopicChanged: function () {
            var msg = grunt.config.get('notificationMessage');
            msg += '<li>HipChat topic changed for Main Chat room.</li>';
            msg += '</ul>';
            msg += '<br><strong>The notifications above are for ' + grunt.config.get('pluginParams.slug') + '.</strong>';
            grunt.config.set('notificationMessage', msg);
        },
        setNotifications: function (task) {
            //grab what notification we're running.
            //grab message.
            var nameregex = new RegExp(task.name + '\\.', 'g'),
                options_string = task.nameArgs.replace(/:/g, '.'),
                task_name = options_string.replace(nameregex, ''),
                task_notification = task_name + '.notify',
                slack_task_notification = task_name + '.slacknotify',
                msg = grunt.config.get('notificationMessage'),
                slackmsg = grunt.config.get('slackNotificationMessage');

            if (task.args[0] === 'init') {
                msg = '<b>GruntBOT activity Report for:</b><br>';
                msg += 'Task Group Run: <b>' + task.args[1] + '</b><br><br>';
                msg += 'Notification Messages:<br>';
                msg += '<ul>';

                grunt.config.set('taskGroupName', task.args[1]);

                slackmsg.fallback = 'Grunt performed some tasks on the server';
                slackmsg.pretext = "Here are all the tasks completed";
                slackmsg.title = "GruntBOT activity report";
                slackmsg.mrkdwn_in = ["text", "pretext"];
                slackmsg.text = "";

                grunt.config.set('notificationMessage', msg);
                grunt.config.set('slackNotificationMessage', slackmsg);
                grunt.log.ok('Messages initialized for notifications successfully.');

                grunt.verbose.writeln(console.log(task.args));

                //set background color for chat client:
                if (typeof task.args[2] !== 'undefined' && task.args[2] !== null) {
                    grunt.config.set('notificationColor', task.args[2]);
                    slackmsg.color = task.args[2];
                }

                switch (task.args[1]) {
                    case 'pr_custom' :
                    case 'pr' :
                        grunt.config.set('preReleaseBuild', true);
                        break;
                    case 'microzip' :
                        grunt.config.set('microZipBuild', true);
                        break;
                }

                return true;
            } else if (task.args[0] === 'end') {
                /**
                 * Grab topic from slack instead of hipchat.
                 */
                if (grunt.config.get('pluginParams.slug') === 'event-espresso-core-reg'
                    && grunt.config.get('microZipBuild') !== true
                    && grunt.config.get('preReleaseBuild') !== true
                    && grunt.config.get('syncBranch') === 'master'
                ) {
                    grunt.task.run('slack_api:get_topic_info');
                } else {
                    msg += '</ul>';
                    msg += '<br><strong>The notifications above are for ' + grunt.config.get('pluginParams.slug') + '.</strong>';

                    slackmsg.fields = [
                        {
                            "title": "Plugin",
                            "value": grunt.config.get('pluginParams.slug'),
                            "short": true
                        },
                        {
                            "title": "Task Run",
                            "value": grunt.config.get('taskGroupName'),
                            "short": true
                        }
                    ];
                    grunt.config.set('notificationMessage', msg);
                    grunt.config.set('slackNotificationMessage', slackmsg);
                }
                return true;
            }
            //grab any notify message for the given action.
            var notification_message = grunt.config.get(task_notification);
            var new_version = grunt.config.get('new_version');
            grunt.verbose.ok(task_name);
            grunt.verbose.ok(new_version);
            if (notification_message !== null) {
                switch (task_name) {
                    case 'shell.bump_rc' :
                        grunt.config.set('rc_version', new_version);
                        break;
                    case 'shell.bump_minor' :
                        grunt.config.set('minor_version', new_version);
                        break;
                    case 'shell.bump_major' :
                        grunt.config.set('major_version', new_version);
                        break;
                }

                var slack_notification_message = grunt.config.get(slack_task_notification);
                slack_notification_message = slack_notification_message === null || typeof slack_notification_message === 'undefined'
                    ? notification_message
                    : slack_notification_message;

                msg += '<li>' + notification_message + '</li>';
                slackmsg.text += "• " + slack_notification_message + "\n";
                grunt.verbose.ok(notification_message);
                grunt.config.set('notificationMessage', msg);
                grunt.config.set('slackNotificationMessage', slackmsg);
            }
            return true;
        }
    };
module.exports = notifications;
