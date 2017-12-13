/**
 * Module for transforming things
 */
var grunt = {};
module.exports = {
    setGrunt: function (gruntObject) {
        grunt = gruntObject;
    },
    compressPhp: function() {
        var params = grunt.config.get( 'pluginParams' );
        if ( params.compressPhpPath ) {
            grunt.task.run( 'shell:compress_php', 'setNotifications:shell:compress_php' );
        }
    }
};
