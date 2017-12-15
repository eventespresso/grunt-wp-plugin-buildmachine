# WordPress Plugin Buildmachine for Grunt

This library is a grunt package the provides a "build machine" for WordPress plugins.  The Event Espresso team has used variations of this library for our entire plugin/add-on library for the last 3 years. Once configured, the following tasks can be done by this library:

* Version bump your plugin (minor, major). By "version bump", this automatically changes the versions listed in your main plugin file (plugin header, and anywhere else the version is mentioned in that file). Currently this is not semver, you can customize version recognition in the `version-bump.php` file.
* Build various release zips of your plugin and also tags those releases.
* POT builds.
* Release on wp.org
* Notifies slack/hipchat when a task is done (and modifies topics of a given chat room to update the current release).
* Automatically commits any changes.

The buildmachine uses connected repositories (git) as the source for all builds.  Once you've set it up, you don't have to touch the plugin files again for the purpose of the machine.

**Why Grunt?**

Grunt _is_ a bit ancient in the web development world.  Many of the grunt plugins used in this library haven't really been updated in a while either.  However, functionally things still work and there hasn't been need to switch to a different task manager (like the cool kid gulp). Pretty much everything in this library _could_ probably be replicated in a different task manager though - if you, dear reader, want to give it a try - go for it!

## Machine Setup

### 1. Ensure you have `node` and `grunt-cli` setup.
You need to have node and grunt-cli setup on the box you are setting this up on.  If you don't have this setup there are plenty of tutorials available for doing so.  Once you're done come back here.

### 2. Clone in this repo and install.

Do the following:

```shell
$: git clone https://github.com/eventespresso/grunt-wp-plugin-buildmachine.git buildmachine
$: npm install
```

### 3. Fill out configuration files.

There are two configuration files you need to create and samples are provided in the root of the machine. The final files are .gitignored so you won't accidentally push them to a shared repo.  While we're on the subject, the following folder contents are also ignored: `builds`, `buildsrc`, `checkout`, `potbuilds`, `wpbuilds`, `node_modules`

| Sample file | Final file | Purpose |
| ----------- | ---------- | -------- |
| private.json.sample | private.json |  Contains all the private credentials for communicating with third party services.  Must be valid json.
| buildmap.json.sample | buildmap.json | This is where you configure the plugin repositories your buildmachine will be working with. Must be valid json.

The `buildmap.json` file allows for multiple plugins to be handled by the buildmachine.  Simply add each plugin repo as a different object in the json array.  Each object can have as many remotes as you want for each plugin and the build machine will handle pushing to all those remotes with various build tasks.  At a minimum, each plugin should have one remote and it must be indexed by the key `origin`.  This remote always serves as the "authoritative" source for the builds (and is the only remote `pulled` from to update the files for builds).  If you include a index with the key `github`, this is required for the task that pushes any branch update to github.

Why allow for multiple remotes? There's many uses, but the primary one we have for this in our builds is to automatically push any plugin changes to repos wired up for updating test sites running our plugins (More on fully automating this later in this doc.)

### 4. Make sure your host machine has authorization to connect with and push to all registered remotes.

By "host" machine, we mean the machine you've installed this library on.  The best way to setup authorization is to create ssh keys for your host machine and register the public key with whatever servers/services hosting the remotes being pulled/pushed to.  Otherwise you will have to enter authorization credentials everytime you run a task.


### 5. Plugin Setup and adding it to the buildmachine.

Your next task is to setup any plugins you've registered remotes for in the build machine.  In order to recognize and know what to do with plugins, your plugin must have a `info.json` file in its root path (i.e located in the same path as the plugin's `readme.txt` file).  You can use the `info.json.sample` bundled with the buildmachine as an example, but remember the final file goes in your _plugin_ not this library.

**Note:** not all of these elements are required to be in your final `info.json`.  It depends on what tasks in the build machine you will be running.  The task table later on in the document highlights what `info.json` elements are required for the task.

What all the things mean in the info.json:

| json object key | type | Description |
| --------------- | ----- | ---------  |
| versionFile | string | this is main plugin file that contains the plugin header and version info.  The file name you put here helps the build machine know what file to modify for version bumps. |
| slug | string | Slug you use for publishing your plugin outside of wp-org.  Pre release builds have `-pr` appended to this slug.  This primarily matters for build release tasks because it determines what path the plugin will expand to when the archive is unzipped. |
| textDomain | string | this is the text domain you use throughout your plugin for localization.  Used by the build machine for building pots. |
| wpOrgSlug | string | The slug for your plugin on WordPress.org plugin repo. |
| wpOrgMainFileSlug | string | If your plugin has the same base for both premium versions you host on your own site and free version hosted on wp.org, then you'll want to have a different slug used for the archive builds for your wpOrg builds.  This is important so that wpOrg automatic updates work correctly.  This same reason applies for the wpOrgPluginName and wpOrgPluginUrl indexes. | 
| wpOrgUser | string | username of user with authorization for publishing the plugin on wordpress.org |
| wpOrgRelease | string | This is automatically set by the version bumper in the build machine, but you can manually set it as well.  This is the tag that will be used as the source for wp.org builds.  This tag will be checked out from the origin git remote.
| wpOrgPluginName | string | This will replace the existing plugin name in the plugin header of your main file for WordPress.org releases.  See `wpOrgMainFileSlug` for why this is necessary. |
| wpOrgPluginUrl | string | This will replace the existing plugin url in the plugin header of your main file for WordPress.org releases. See `wpOrgMainFileSlug` for why this is necessary. |
| name | string | This is the name for  your plugin, mostly just used for any notifications. |
| jsBuildDirectory | string | Directory to your js/css build directory relative to the plugin's root path.  For certain build processes, if this entry is present and the path is valid, `npm run build` will be executed in that directory as a part of the build process.  Super useful if you have a build process for any js in your plugin. |
| releaseFilesRemove | array | An array of paths to remove on release type builds.  This is useful when you have files in your repo that you don't want included with any release zips. the `.git` metadata folder is automatically removed from release zips and doesn't need included in this array.  Format for pattern matches is the same you use for bash `ls` pattern matches. |
| decafFilesRemove | array | Similar to the `releaseFilesRemove`, this is used for any files removed for wordpress.org releases.  The name of this element is a carry over for how EventEspresso labels its WordPress.org releases.  Decaf == Free, get it?
| github | boolean | Use this to indicate if your plugin should push any changes to github.  If you set this to true, then you must have a remote configured in the `buildmap.json` you created for this plugin with `github` as the remote name.  Of course, if your `origin` IS a github repo, then this is not needed.
| awsbucket and awsregion | string | Currently this is not fully implemented/tested.  The plan was to be able to automatically handle pushing any release builds to a S3 bucket but haven't got around to finishing this off yet.  Try it if you need it.  Pull requests welcome!
| remoteNamesToPushTo | array | This elements in this array should correspond to the names registered as remotes for this plugin in the `buildmap.json` file you created. |

### 6. Execute initialization command for build machine.

From within the build machine directory you installed this library in, execute the following command:

```shell
$: grunt builder:init
```

What this does:

* loads the `buildmap.json` configuration.
* loads the `private.json` configuration.
* loops through each configured object from the buildmap.json
* pulls the origin remote into a temporary directory to load the info.json from the plugin.
* uses that to get the slug of the plugin, creates a directory from that slug name in `buildsrc` and then clones origin into that directory.
* clones origin into the `potbuilds` directory (within a directory created using slug name).
* registers any other remotes assigned to that same plugin in the `buildmap.json` within the repo cloned in `buildsrc`.
* writes information to `installedReposMap.json` for usage by any other automation tool you have (see the [Automate things](#automate-things) section).

### 7. Checkout the svn repo from wp.org.

If you plan on publishing your plugin to WordPress.org, then you need to make sure the svn copy of the plugin is checked out for those builds to use.  This of course requires that the host machine has svn setup on it.  You'll want to checkout the plugin from WordPress.org into a subdirectory you create in `checkout` and the subdirectory name should match the directory name for the plugin within `buildsrc`.  So for example, if your plugin was installed by the `builder:init` script within `buildsrc/event-espresso`.  Then you need to checkout the plugin from wordpress.org in `checkout/event-espresso`.

### 8. That's It!

Everything should be setup now for you to run the build machine commands.  If at any time you want to modify the setup for an existing plugin (i.e. register new remotes to automatically push to) or add a new plugin, just update your `buildmap.json` file and then re-run `builder:init` and that's it!

## Commands Available

The following commands are available.  You can get this list from the command line as well by simply executing `grunt --help` from within the grunt build directory. As far as the command structure in this list.  I've followed this schema:

```
command:{plugin_slug}[:{subcommand}]
```

* `{plugin_slug}`:  If this is present then you _must_ include the slug of the plugin with the command (e.g. grunt updateRemotes:event-espresso-core-reg).  This is because the command needs to know what plugin to execute the build against. 
* `{subcommand}`: simply means this is where you'd put the subcommand string.  Options for what that string could be will be listed in the options column. Anything surrounded by square `[]` brackets is something that is optional.

> **Note:** When you use `grunt help` to list commands, it will list more commmands than what are listed out below.  This is because the below commands are intended to be the publicly usable tasks whereas `grunt help` includes commands that are embedded in other tasks (and thus dependent on other tasks having run).  There's still work needing done on using  `grunt.task.requires` to set dependencies. 

| command | options | description | info.json key requirements | buildmaching config requirements |
|---------|----------|------------|-----------------------------------| -------------|
| testinggitinfo:{plugin_slug} |  - | Tests the gitinfo plugin and verifies repo is setup for given plugin slug. | - | - |
| maybeRunNpmTest:{plugin_slug} | - | Tests the npm task. Verifies the path set for `jsBuildDirectory` works for the task. | -  | - |
| builder:{subcommand} | `init` - currently the only option, used for initializing the plugin setup for the builder | Build machine initialization and other tasks. | `slug` | `origin` in buildmap.json |
| updateRemotes:{plugin_slug} | - | Updates all the registered remotes for the given plugin | `remoteNamesToPushTo` | - |
| bumprc_master:{plugin_slug} | - | Bumps the release version on master for given plugin slug.  See the [Version Bumper](#version-bumper) section for more details. | `versionFile`, `slug`, `name` | - |
| hotfix:{plugin_slug} | - | This builds a "hotfix" release from the master branch of the given plugin.  A hotfix release bumps the micro version.  See more info in the [Version Bumper](#version-bumper) section related to versions.  The release build will end up in whatever path you indicated for the `build_creds.archiveBasePath`. **Note:** it is suggested you protect your `build_creds.archiveBaseUrl` with basic auth (which is what `build_creds.archiveUser` and `build_creds.archivePass` should represent) unless you are okay with the builds publicly available at the url. | `versionFile`, `slug`, `name`, `releaseFilesRemove` | `build_creds` (private.json) |
| release:{plugin_slug} | - | Behaves the same as `hotfix` except it bumps the minor version. | `versionFile`, `slug`, `name`, `releaseFilesRemove` | `build_creds` (private.json) |
| pr_custom:{plugin_slug}:{branch_name} | `branch_name` should be the full name you want the pre-release built off of. | Behaves similarly to `hotfix` and `release` builds except this creates a build off of the provided branch name and versions it as a pre-release | `versionFile`, `slug`, `name`, `releaseFilesRemove` | `build_creds` (private.json) |
| pr:{plugin_slug} | - | Behaves similarly `pr_custom` task except it just builds a pr version off of the master branch fro the given plugin. | `versionFile`, `slug`, `name`, `releaseFilesRemove` | `build_creds` (private.json) |
| microzip:{plugin_slug} | - | Behaves similarly to other release build types except this simply changes the version type from `rc` to `p` and leaves all other version numbers intact.  The purpose behind microzip builds is to release special builds for customers that will still fall between the current release and future releases (for update notifications etc) |  `versionFile`, `slug`, `name`, `releaseFilesRemove` | `build_creds` (private.json) |
| wpdeploy:{plugin_slug} | - | This will build a 'decaf' relase version of the plugin, and deploy it to WordPress.org plugins repo.  This release is built from a tag defined by the string indicated on the `wpOrgRelease`. | `versionFile`, `slug`, `wpOrgSlug`, `wpOrgMainFileSlug`, `wpOrgUser`, `wpOrgRelease`, `wpOrgPluginName`, `wpOrgPluginUrl`, `decafFilesRemove` | `build_creds` (private.json) |
| wpdeploy_ziponly:{plugin_slug} | - | Does the same thing as the `wpdeploy` command except ths does not actually deploy to WordPress.org.  Instead it just builds a zip of what _would_ be deployed to wp.org.  Useful for verifying everything works as expected before doing the actual deploy. | `versionFile`, `slug`, `wpOrgSlug`, `wpOrgMainFileSlug`, `wpOrgUser`, `wpOrgRelease`, `wpOrgPluginName`, `wpOrgPluginUrl`, `decafFilesRemove` | `build_creds` (private.json) |
| pot_only:{plugin_slug} | - | This builds the pot file for the given plugin. | `slug`, `textDomain` | `build_creds` (private.json) |
| githubsync:{plugin_slug}:{branch_name} | `branch_name` should be the branch synced with github. | This task is for syncing named branches with github (as opposed to the default master branch) | `slug`, `github` | - |


## Version Bumper

The version bumper script in this library makes the following hard coded assumptions that have not been abstracted for customization yet.  Before judging, keep in mind much of this versioning assumptions are relics from relatively ancient EE history.

The schema for a version is `{major}.{minor}.{micro}.{version_type}.{nano}`.  An example would be `4.9.56.rc.001`.

* major: is something that only gets bumped to the next higher value when "minor" reaches `10`.  
* minor:  is bumped incrementally up to `10` and only on "release" builds.
* micro: is bumped incrementally with no upper limit on the value and only on "hotfix" builds.
* nano: is bumped incrementally with no upper limit on the value and only on "micro" or "rc" builds.
* version_type: is one of `p`, `rc`, `pr` or `decaf`.  `p` is used for `release`, `hotfix`, or `micro` builds. `pr` is used for pre-release builds.  `rc` is used for rc builds. `decaf` is used for wp.org builds.

The version bumping script is located in `version-bump.php`.  If you want to customize how version bumping works, you can use that but you'll also have to modify the `shell` tasks related to version bumping in `Gruntfile.js`.

We hope to make this more abstract in the future (and possibly default to semver version bumping) but for now this is specific to the needs of EventEspresso. 

## Automate things

On its own this library is very useful.  However, where it really shines is when its partnered with another script for automatically calling specific commands when a change is pushed to a repository.  For example, Event Espresso uses [this webhook application](https://github.com/nerrad/codebase_webhook) to listen for pushes to our respository on the codebasehq service, and then automatically starts the appropriate grunt task in this build machine.  We use this for automatic version bumping whenever we push commits to master branch of our add-ons (super useful for accurately reporting what version issues are happening in for testing), and for automatically syncing pushes with various testing sites as well as our public github repos.  Although the linked tool above is available for use, it isn't really documented that well.  However the code should be simple enough to use as a guide for any similar tool you might want to build using github webhook notifications for example.

The build machine provides a `installedReposMap.json` json file containing a simple object map of key:value pairs where the key is the directory the plugin is located within the `build_src` folder, and the value is the repository address mapped to the remote named `origin` for that plugin.  That way any webhook you built can be correctly wired according to the incoming package.

## Known Issues

- if you are using a webhook to trigger tasks via php `shell_exec` or `exec` methods, the `grunt-git` and `grunt-gitinit` plugins in the `node_modules` folders will not work as is because they just utilize the `git` command directly (assuming its in the path of the caller).  The temporary fix is to edit their tasks so that they point to the absolute path of the git binary (usually `usr/bin/git`).  This may or may not be an issue in your server environment.