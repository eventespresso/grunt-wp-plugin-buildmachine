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
            grunt.task.run(
                'shell:compress_php',
                'setNotifications:shell:compress_php',
                'gitadd:version',
                'gitcommit:compress_php',
                'setNotifications:gitcommit:compress_php'
            );
        }
    },
    vidVersionReplace: function() {
        grunt.task.run(
            'shell:vid_version_replace',
            'setNotifications:shell:vid_version_replace'
        );
        this.vidVersionReplaceChangelog();
        grunt.task.run(
            'gitadd:version',
            'gitcommit:vid_version_replace',
            'setNotifications:gitcommit:vid_version_replace'
        );
    },
    vidVersionReplaceChangelog: function() {
        var params = grunt.config.get('pluginParams'),
            packagePath = 'buildsrc/' + params.slug + '/CHANGELOG.md';
        if ( grunt.file.exists(packagePath) ) {
            grunt.task.run(
                'shell:vid_version_replace_changelog',
                'setNotifications:shell:vid_version_replace_changelog'
            );
        }
    }
};
