/**
 * Module for initializing various parameters etc.
 **/
var remoteSync = require('./remote-sync');
var utils = require('./utils.js');
module.exports = {
    remote: remoteSync,
    utils: utils,
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
        grunt.config.set('currentSlug', pluginSlug);
    },
    initializeFromMap: function() {
        var buildMap = grunt.config.get('buildMap'),
            init = this;
        buildMap.map.forEach(function(remotes) {
            init.initializeSrc(remotes);
        });
        grunt.log.oklns('Finished initializing all remotes in the buildmap.json file');
    },
    initializeSrc: function(remotes) {
        if (typeof remotes.origin === 'undefined') {
            grunt.fail.warn('Cannot build because there is no origin defined for the remotes.');
            return;
        }
        var pluginSlug = this.getPluginSlugForBuild(remotes.origin),
            existingDirs = this.getInstalledDirs(),
            slugExists = existingDirs.indexOf(pluginSlug) > -1,
            tasksToRun = [];
        this.setNewShellTasksForBuilder(pluginSlug, remotes['origin'], remotes);
        //only run clone if the directory isn't already present
        if (! slugExists) {
            tasksToRun.push('shell:cloneOrigin');
            grunt.log.oklns('Skipping cloning ' + pluginSlug + ' because it already exists.');
        }
        tasksToRun.push('shell:registerRemotes');
        grunt.run.task(tasksToRun);
        grunt.log.oklns('Finished initializing remotes for ' + pluginSlug);
    },
    setNewShellTasksForBuilder: function(pluginSlug, originRepoAddress, remotesToRegister) {
        var destination = 'buildsrc/' + pluginSlug,
            shellConfig = grunt.config.get('shell'),
            remoteRegistrationCommand = [];
        shellConfig.cloneOrigin = {
            command: [
                'cd buildsrc',
                'mkdir -p ' + pluginSlug,
                'git clone ' + originRepoAddress + ' ' + pluginSlug
            ].join('&&')
        }

        //prep commands for doing the remote registrations
        remoteRegistrationCommand.push('cd ' + destination);
        remotesToRegister.forEach(function(remoteItem) {
            for (var remoteName in remoteItem) {
                if (remoteName !== 'origin' && remotesToRegister.hasOwnProperty(remoteName)) {
                    remoteRegistrationCommand.push(
                        'git remote remove ' + remoteName + '; git remote add -f' + remoteName + ' ' + remotesToRegister[remoteName]
                    );
                }
            }
        });
        shellConfig.registerRemotes = {
            command: remoteRegistrationCommand.join('&&')
        };
        grunt.config.set('shell', shellConfig);
    },
    getPluginSlugForBuild: function(originRepoAddress) {
        var infoPath = 'buildsrc/tmp/info.json',
            shellConfig = grunt.config.get('shell');
        shellConfig.temp_install = {
            command: [
                'cd buildsrc',
                'mkdir -p tmp',
                'git clone ' + originRepoAddress + ' tmp'
            ].join('&&')
        };
        shellConfig.temp_remove = {
            command: [
                'cd buildsrc',
                'rm -rf tmp'
            ].join('&&')
        };
        grunt.config.set('shell', shellConfig);
        grunt.task.run(['shell:temp_install']);
        //k now the repo should be cloned, so we should be able to grab info from the info.json
        info = grunt.file.exists(infoPath) ? grunt.file.readJSON(infoPath) : null;
        if (info === null || typeof info.slug === 'undefined') {
            grunt.fail.warn('Unable to get the info.json from the cloned repository.  Make sure all origin remote addresses have a info.json file in the root directory.');
        }
        //delete temp
        grunt.task.run(['shell:temp_remove']);
        grunt.log.oklns('Finished grabbing the plugin slug from the origin repo.');
        return info.slug;
    },
    getInstalledDirs: function()
    {
        var dirs = [];
        grunt.file.expand({ cwd: 'buildsrc'}, '/*').forEach(function (file) {
           if (grunt.file.isDir(file)) {
               dirs.push(file);
           }
        });
        return dirs;
    }
};
