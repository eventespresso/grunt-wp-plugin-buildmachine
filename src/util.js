/**
 * Utils module, some utility helper functions
 **/
var grunt = {};
module.exports = {
    setGrunt: function (gruntObject) {
        grunt = gruntObject;
    },
    rmPrepareFolders: function (folders_to_remove) {
        var folders = [],
            pluginSrc = 'buildsrc/' + grunt.config.get('currentSlug') + '/';
        if (typeof folders_to_remove === 'undefined') {
            return folders;
        }
        for (var i = 0; i < folders_to_remove.length; i++) {
            //replace `src/` with empty string
            folders_to_remove[i] = folders_to_remove[i].replace('src/', '');
            //prepend pluginSrc onto the path.
            folders_to_remove[i] = pluginSrc + folders_to_remove[i];
            folders[i] = 'rm -rf ' + folders_to_remove[i];
        }
        return folders;
    },
    setNewVersion: function(err, stdout, stderr, cb) {
        grunt.config.set('new_version', stdout);
        grunt.log.writeln();
        grunt.log.ok('Version bumped to ' + stdout);
        if ( stdout !== '0' ) {
            cb();
        } else {
            grunt.fail.warn( 'Something went wrong with setting the version' );
            cb();
        }
    },
    getInstalledDirs: function()
    {
        return grunt.file.expand({filter: 'isDirectory', cwd: 'buildsrc'}, ['*']);
    }
};
