const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const ByteArray = imports.byteArray;
const Mainloop = imports.mainloop;
const Lang = imports.lang;

let button;

function log(message) {
    print('wakatime-gnome-tracker: ' + message);
}

/**
 * @source https://andyholmes.github.io/articles/asynchronous-programming-in-gjs.html
 * @param {*} argv
 * @param {*} cancellable
 */
async function execCommand(argv, cancellable = null) {
    try {
        // There is also a reusable Gio.SubprocessLauncher class available
        let proc = new Gio.Subprocess({
            argv: argv,
            // There are also other types of flags for merging stdout/stderr,
            // redirecting to /dev/null or inheriting the parent's pipes
            flags: Gio.SubprocessFlags.STDOUT_PIPE
        });

        // Classes that implement GInitable must be initialized before use, but
        // an alternative in this case is to use Gio.Subprocess.new(argv, flags)
        //
        // If the class implements GAsyncInitable then Class.new_async() could
        // also be used and awaited in a Promise.
        proc.init(null);

        let stdout = await new Promise((resolve, reject) => {
            // communicate_utf8() returns a string, communicate() returns a
            // a GLib.Bytes and there are "headless" functions available as well
            proc.communicate_utf8_async(null, cancellable, (proc, res) => {
                let ok, stdout, stderr;

                try {
                    [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
                    resolve(stdout);
                } catch (e) {
                    reject(e);
                }
            });
        });

        return stdout;
    } catch (e) {
        logError(e);
    }
}

// TODO: CLEAN AND REORGANIZE CODE
class Extension {
    constructor() {
        this._container = new St.Bin({
            style_class: "wk-container",
            reactive: true,
            can_focus: true,
            x_fill: false,
            y_fill: false,
            x_align: St.Align.MIDDLE,
            y_align: St.Align.MIDDLE,
            track_hover: true
        });

        this._label = new St.Label({
            style_class: "wk-label",
            y_align: St.Align.MIDDLE
        });

        this._container.set_child(this._label);
        this._container.connect('button-press-event', this._handleReloadClick.bind(this));

        this._load();
        this._update();
    }

    enable() {
        Main.panel._rightBox.insert_child_at_index(this._container, 0);
    }

    disable() {
        Main.panel._rightBox.remove_child(this._container);
    }

    _handleReloadClick() {
        log('handle click');
        this._refresh();
    }

    _load() {
        this._command = ['wakatime', '--today'];
        this._refreshRate = 300;
    }

    _refresh() {
        const t = this._label.get_text() + ' ...';
        log('set label: ' + t);
        this._label.set_text(t);
        this._fetch();
    }

    _update() {
        log('call _update');
        this._refresh();
        log('wait ' + this._refreshRate + 's');

        Mainloop.timeout_add_seconds(this._refreshRate, () => {
            this._update();
        });
    }

    _fetch() {
        log('call _fetch');

        execCommand(this._command).then((stdout) => {
            const out = stdout.toString().trim() || 'N/A';

            log('set label: ' + out);
            this._label.set_text(out);
        }, () => {
            this._label.set_text('N/A');
        });
    }

    _isFound(str) {
        var f = str.indexOf('~') > -1

        if (f) {
            return [f, str.replace(/~/gi, GLib.get_home_dir())];
        } else {
            return [f, str];
        }
    }

    _toUtfArray(str) {
        let [f, s2] = this._isFound(str);
        let arr = s2.split(" ");

        return arr;
    }
}

function init() {
    return new Extension();
}
