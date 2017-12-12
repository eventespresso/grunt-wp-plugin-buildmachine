/**
 * Module for transforming things
 */
module.exports = {
    compressPhp: function() {
        var params = grunt.config.get( 'pluginParams' );
        if ( params.compressPhpPath ) {
            grunt.task.run( 'shell:compress_php', 'setNotifications:shell:compress_php' );
        }
    }
};
