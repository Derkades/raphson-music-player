const editor = {
    currentlyEditingPath: null,
    open: (track) => {
        if (track == null) {
            throw new Error('Track is null');
        }
        editor.currentlyEditingPath = track.path;
        document.getElementById('editor-title').value = track.title;
        document.getElementById('editor-album').value = track.album;
        document.getElementById('editor-artists').value = track.artists !== null ? track.artists.join('/') : '';
        document.getElementById('editor-album-artist').value = track.album_artist;
        document.getElementById('editor-tags').value = track.tags.join('/');

        dialog.open('dialog-editor');
    },
    getValue: (id, list = false) => {
        let value = document.getElementById(id).value;
        if (list) {
            const list = value.split('/');
            for (let i = 0; i < list.length; i++) {
                list[i] = list[i].trim();
            }
            return list
        } else {
            value = value.trim();
            return value === '' ? null : value;
        }
    },
    save: async function() {
        const payload = {
            path: editor.currentlyEditingPath,
                metadata: {
                title: editor.getValue('editor-title'),
                album: editor.getValue('editor-album'),
                artists: editor.getValue('editor-artists', true),
                album_artist: editor.getValue('editor-album-artist'),
                tags: editor.getValue('editor-tags', true),
            }
        }

        editor.currentlyEditingPath = null;

        document.getElementById('editor-save').classList.add("hidden");
        document.getElementById('editor-writing').classList.remove("hidden");

        const response = await fetch(
            '/update_metadata',
            {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)}
        );
        checkResponseCode(response);

        document.getElementById('editor-writing').classList.add('hidden');
        document.getElementById('editor-reloading').classList.remove('hidden');

        await updateLocalTrackList();

        document.getElementById('editor-reloading').classList.add('hidden');
        document.getElementById('editor-save').classList.remove('hidden');

        dialog.close('dialog-editor');
    },
};