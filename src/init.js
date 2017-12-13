/**
 * Module for initializing various parameters etc.
 **/
var remoteSync = require('./remote-sync');
var crypto = require('crypto');
var utils = require('./util.js');
var grunt = {};
module.exports = {
    remote: remoteSync,
    utils: utils,
    crypto: crypto,
    setGrunt: function (gruntObject) {
        grunt = gruntObject;
    },
    setPluginParams: function (task) {
        var pluginSlug = grunt.config.get('currentSlug'),
            src = 'buildsrc/' + pluginSlug + '/info.json',
            params = grunt.file.exists(src) ? grunt.file.readJson(src) : null,
            gitinfo = grunt.config.get('gitinfo');

        if (params === null) {
            grunt.fail.warn('The repo must have a valid info.json file in it with params for the remaining tasks.  Maybe you had a typo in the provided plugin slug?');
        }
        grunt.log.ok('Plugin data successfully retrieved from info.json');

        if (typeof gitinfo.local === 'undefined') {
            grunt.fail.warn('git info did not appear to work. It is needed to be able to complete tasks. So aborting.');
        }

        //let's setup certain environment variables based on the git info we've received.
        if (gitinfo.local.branch.current.name === 'master') {
            params.versionType = 'rc';
            params.branch = 'master';
        } else {
            params.versionType = params.branch = gitinfo.local.branch.current.name;
        }

        //set previous commit message for version bump
        if (gitinfo.local.branch.current.lastCommitMessage) {
            grunt.config.set('previousCommitMessage', gitinfo.local.branch.current.lastCommitMessage);
        }

        //pre-release-build?
        if (grunt.config.get('preReleaseBuild')) {
            params.slug = params.slug.replace('-reg', '');
            params.slug += '-pr';
        }

        grunt.config.set('pluginParams', params);

        this.remote.setupRemoteSyncProps();

        //set commands for shell rm task
        grunt.config.set('shell.remove_folders_release.command', this.utils.rmPrepareFolders(params.releaseFilesRemove).join(';'));
        grunt.config.set('shell.remove_folders_decaf.command', this.utils.rmPrepareFolders(params.decafFilesRemove).join(';'));
    },
    initPluginSlug: function(pluginSlug, validate) {
        //if already set, don't continue
        if (grunt.config.get('currentSlug') !== '') {
            return;
        }
        var src = 'buildsrc/' + pluginSlug + '/info.json';
        validate = typeof validate === 'boolean' ? validate : true;
        if (validate && ! grunt.file.exists(src)) {
            grunt.fail.warn('There is no builder repo setup for ' + pluginSlug + '.  Please doublecheck your spelling, or you may need to run builder:init to get that repo setup first.');
        }
        grunt.log.ok('Slug for build set to ' + pluginSlug);
        grunt.config.set('currentSlug', pluginSlug);
    },
    initializeFromMap: function() {
        var buildMap = grunt.config.get('buildMap'),
            init = this,
            generatedMap = {};
        grunt.verbose.writeln(console.log(buildMap));
        buildMap.map.forEach(function(remotes) {
            init.initializeSrc(remotes, generatedMap);
        });
        grunt.registerTask(
            'writeGeneratedMapFile',
            'Write a map of all initialized things to the generated map of origin_repo_address: directoryname',
            function () {
                grunt.file.write('installedReposMap.json', JSON.stringify(generatedMap));
            }
        );
        grunt.task.run('writeGeneratedMapFile');
        grunt.log.oklns('Finished initializing all remotes in the buildmap.json file');
    },
    initializeSrc: function(remotes, generatedMap) {
        if (typeof remotes.origin === 'undefined') {
            grunt.fail.warn('Cannot build because there is no origin defined for the remotes.');
            return;
        }
        var encryptedSlug = crypto.createHash('md5').update(remotes.origin).digest("hex"),
            initObject = this,
            tasksToRun = [
                'queueSettingPluginSlugForBuild_' + encryptedSlug,
                'queueShellTasksForBuilder_' + encryptedSlug
            ];
        grunt.registerTask(
            'queueSettingPluginSlugForBuild_' + encryptedSlug,
            'Enqueue tasks for getting the slug for this set of remotes.',
            function () {
                initObject.queueSettingPluginSlugForBuild(remotes.origin);
            });
        grunt.registerTask(
            'queueShellTasksForBuilder_' + encryptedSlug,
            'Queue Shell tasks for builder.',
            function () {
               initObject.queueNewShellTasksForBuilder(remotes.origin, remotes, generatedMap);
            });
        grunt.task.run(tasksToRun);
    },
    queueNewShellTasksForBuilder: function(originRepoAddress, remotesToRegister, generatedMap) {
        var pluginSlug = grunt.config.get('currentSlug'),
            existingDirs = this.utils.getInstalledDirs(),
            dirExists = existingDirs.indexOf(pluginSlug) > -1,
            destination = 'buildsrc/' + pluginSlug,
            shellConfig = grunt.config.get('shell'),
            remoteRegistrationCommand = [],
            tasksToRun = [];
        grunt.verbose.writeln(console.log(existingDirs));
        shellConfig.cloneOrigin = {
            command: [
                'cd buildsrc',
                'mkdir -p ' + pluginSlug,
                'yes | git clone ' + originRepoAddress + ' ' + pluginSlug
            ].join('&&')
        };
        shellConfig.clonePot = {
            command: [
                'cd potbuilds',
                'mkdir -p ' + pluginSlug,
                'yes | git clone ' + originRepoAddress + ' ' + pluginSlug
            ].join('&&')
        };
        /**
         * add to generatedMap
         */
        generatedMap[pluginSlug] = originRepoAddress;
        grunt.verbose.writeln(console.log(remotesToRegister));
        //prep commands for doing the remote registrations
        remoteRegistrationCommand.push('cd ' + destination);
        for (var remoteName in remotesToRegister) {
            if (remoteName !== 'origin' && remotesToRegister.hasOwnProperty(remoteName)) {
                remoteRegistrationCommand.push(
                    'git remote remove ' + remoteName + '; yes | git remote add -f ' + remoteName + ' ' + remotesToRegister[remoteName]
                );
            }
        }
        shellConfig.registerRemotes = {
            command: remoteRegistrationCommand.join('&&')
        };
        grunt.config.set('shell', shellConfig);
        //now queue up tasks that run
        if (! dirExists) {
            tasksToRun.push('shell:cloneOrigin');
            tasksToRun.push('shell:clonePot');
        }
        tasksToRun.push('shell:registerRemotes');
        grunt.task.run(tasksToRun);
        grunt.log.oklns('Finished initializing remotes for ' + pluginSlug);
    },
    queueSettingPluginSlugForBuild: function(originRepoAddress) {
        var infoPath = 'buildsrc/tmp/info.json',
            shellConfig = grunt.config.get('shell');
        shellConfig.temp_install = {
            command: [
                'cd buildsrc',
                'mkdir -p tmp',
                'yes | git clone ' + originRepoAddress + ' tmp'
            ].join('&&')
        };
        shellConfig.temp_remove = {
            command: [
                'cd buildsrc',
                'rm -rf tmp'
            ].join('&&')
        };
        grunt.registerTask( 'setPluginSlugFromTemp', 'Sets the plugin slug from the temp directory', function () {
            //k now the repo should be cloned, so we should be able to grab info from the info.json
            info = grunt.file.exists(infoPath) ? grunt.file.readJSON(infoPath) : null;
            if (info === null || typeof info.slug === 'undefined') {
                grunt.fail.warn('Unable to get the info.json from the cloned repository.  Make sure all origin remote addresses have a info.json file in the root directory.');
            }
            grunt.config.set('currentSlug', info.slug);
            grunt.log.oklns('Finished grabbing the plugin slug from the origin repo.');
        });
        grunt.config.set('shell', shellConfig);
        grunt.task.run([
            'shell:temp_install',
            'setPluginSlugFromTemp',
            'shell:temp_remove'
        ]);
    }
};
