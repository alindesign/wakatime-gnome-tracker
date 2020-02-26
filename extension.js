const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;

const Main = imports.ui.main;
const ByteArray = imports.byteArray;
const Mainloop = imports.mainloop;
const Lang = imports.lang;

let button;

function log (message) {
    print('wakatime-gnome-tracker: ' + message);
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
        this._command = "wakatime --today";
        this._refreshRate = 600;
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
        let [res, out] = GLib.spawn_sync(null, this._toUtfArray(this._command), null, GLib.SpawnFlags.SEARCH_PATH, null);

        let t = "";
        if (out == null) {
            t = _("Error executing command.");
        } else {
            t = ByteArray.toString(out);
        }

        log('set label: ' + t);
        this._label.set_text(("" + t).trim());
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
