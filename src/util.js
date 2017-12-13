/**
 * Utils module, some utility helper functions
 **/
var grunt = {};
module.exports = {
    setGrunt: function (gruntObject) {
        grunt = gruntObject;
    },
    rmPrepareFolders: function (folders_to_remove) {
        var folders = [];
        if (typeof folders_to_remove === 'undefined') {
            return folders;
        }
        for (var i = 0; i < folders_to_remove.length; i++) {
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
    }
};
