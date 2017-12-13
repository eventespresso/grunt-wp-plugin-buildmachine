/**
 * Module for remote sync handling
 **/
var grunt = {};
module.exports = {
    setGrunt: function (gruntObject) {
        grunt = gruntObject;
    },
    setupRemoteSyncProps: function () {
        var eeParams = grunt.config.get('pluginParams'),
            remotes = eeParams.remoteNamesToPushTo,
            remoteSync = {};

        if (typeof remotes === 'undefined' || remotes.length < 1) {
            //don't do anything if there are no remoteNamesToPushTo.
            return;
        }

        remoteSync.notify = (function (r) {
            var notifyString = "Pushed master branch to the following repo locations (remote names): ";
            remotes.forEach(function (el) {
                notifyString += el;
            });
            return notifyString;
        }(remotes));
        remoteSync.command = (function (remotes) {
            var commandsToRun = [];
            remotes.forEach(function (el) {
                commandsToRun.push('cd src');
                commandsToRun.push('unset GIT_DIR');
                commandsToRun.push('git push ' + el + ' <%= pluginParams.branch %>');
            });
            return commandsToRun;
        }(eeParams.remoteNamesToPushTo)).join('&&');

        grunt.config.set('remoteSyncNotify', remoteSync.notify);
        grunt.config.set('remoteSyncCommand', remoteSync.command);
    },
    githubOnlyPush: function (task) {
        var params = grunt.config.get('pluginParams');
        var msg = "", slackmsg = {}, doNotify = false;

        if (params.github) {
            grunt.task.run('shell:githubSync', 'setNotifications:shell:githubSync');

            msg += '<%= syncBranch %> branch for <%= pluginParams.name %> has been pushed to github.<br>';
            slackmsg.fallback = "<%= syncBranch %> branch for <%= pluginParams.name %> has been pushed to github.\n";
            slackmsg.color = "good";
            slackmsg.text = "<%= syncBranch %> branch for <%= pluginParams.name %> has been pushed to github.\n";
        }

        if (msg !== "") {
            grunt.config.set('mainChatMessage', msg);
            grunt.config.set('mainChatSlackMessage', slackmsg);
            grunt.config.set('mainChatColor', 'purple');
            doNotify = true;
        }

        if (doNotify) {
            grunt.task.run('hipchat_notifier:notify_main_chat');
            grunt.task.run('slack_api:notify_main');
        }
    },
    allRemotesPush: function(task) {
        var params = grunt.config.get( 'pluginParams' ),
            msg = "",
            slackmsg = {
                text: ''
            },
            doNotify = false;

        if ( params.github ) {
            grunt.task.run( 'shell:githubPush', 'setNotifications:shell:githubPush' );
            msg += '<%= pluginParams.branch %> branch for <%= pluginParams.name %> has been pushed to github.<br>';
            slackmsg.text += "<%= pluginParams.branch %> branch for <%= pluginParams.name %> has been pushed to github.\n";
        }

        if ( typeof params.remoteNamesToPushTo !== 'undefined' && params.remoteNamesToPushTo.length > 0 ) {
            grunt.verbose.writeln( console.log( 'In condition' ) );
            grunt.verbose.writeln( grunt.config.get( 'remoteSyncNotify' ) );
            grunt.verbose.writeln( grunt.config.get( 'remoteSyncCommand' ) );

            msg += grunt.config.get( 'remoteSyncNotify' );
            slackmsg.text += grunt.config.get( 'remoteSyncNotify' );
            grunt.task.run( 'shell:remoteSync', 'setNotifications:shell:remoteSync' );
            doNotify = true;
        }

        if ( msg !== "" ) {
            grunt.config.set('mainChatMessage', msg );
            grunt.config.set( 'mainChatSlackMessage', slackmsg );
            grunt.config.set( 'mainChatColor', 'purple' );
            doNotify = true;
        }

        if ( doNotify ) {
            grunt.task.run( 'hipchat_notifier:notify_main_chat' );
            grunt.task.run( 'slack_api:notify_main' );
        }
    }
};