"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require("url");
const markdown_preview_view_1 = require("./markdown-preview-view");
const renderer = require("./renderer");
const mathjaxHelper = require("./mathjax-helper");
const cast_1 = require("./cast");
const atom_1 = require("atom");
const util_1 = require("./util");
var config_1 = require("./config");
exports.config = config_1.config;
let disposables;
function activate() {
    disposables = new atom_1.CompositeDisposable();
    disposables.add(atom.commands.add('atom-workspace', {
        'markdown-preview-plus:toggle-break-on-single-newline': function () {
            const keyPath = 'markdown-preview-plus.breakOnSingleNewline';
            atom.config.set(keyPath, !atom.config.get(keyPath));
        },
    }), atom.commands.add('.markdown-preview', {
        'markdown-preview-plus:toggle': close,
    }), atom.workspace.addOpener(opener), atom.config.observe('markdown-preview-plus.grammars', configObserver(registerGrammars)), atom.config.observe('markdown-preview-plus.extensions', configObserver(registerExtensions)));
}
exports.activate = activate;
function deactivate() {
    disposables && disposables.dispose();
}
exports.deactivate = deactivate;
function createMarkdownPreviewView(state) {
    if (state.editorId !== undefined ||
        (state.filePath && util_1.isFileSync(state.filePath))) {
        return new markdown_preview_view_1.MarkdownPreviewView(state, true);
    }
    return undefined;
}
exports.createMarkdownPreviewView = createMarkdownPreviewView;
function close(event) {
    const item = event.currentTarget.getModel();
    const pane = atom.workspace.paneForItem(item);
    if (!pane)
        return undefined;
    return pane.destroyItem(item);
}
function toggle(editor) {
    if (!removePreviewForEditor(editor)) {
        addPreviewForEditor(editor);
    }
}
function uriForEditor(editor) {
    return `markdown-preview-plus://editor/${editor.id}`;
}
function removePreviewForEditor(editor) {
    const uri = uriForEditor(editor);
    const previewPane = atom.workspace.paneForURI(uri);
    if (previewPane !== undefined) {
        const preview = previewPane.itemForURI(uri);
        if (preview === undefined)
            return false;
        if (preview !== previewPane.getActiveItem()) {
            previewPane.activateItem(preview);
            return false;
        }
        util_1.handlePromise(previewPane.destroyItem(preview));
        return true;
    }
    else {
        return false;
    }
}
function addPreviewForEditor(editor) {
    const uri = uriForEditor(editor);
    const previousActivePane = atom.workspace.getActivePane();
    const options = { searchAllPanes: true };
    if (atom.config.get('markdown-preview-plus.openPreviewInSplitPane')) {
        options.split = atom.config.get('markdown-preview-plus.previewSplitPaneDir');
    }
    util_1.handlePromise(atom.workspace.open(uri, options).then(function (markdownPreviewView) {
        if (cast_1.isMarkdownPreviewView(markdownPreviewView)) {
            previousActivePane.activate();
        }
    }));
}
function previewFile({ currentTarget }) {
    const filePath = currentTarget.dataset.path;
    if (!filePath) {
        return;
    }
    for (const editor of atom.workspace.getTextEditors()) {
        if (editor.getPath() === filePath) {
            addPreviewForEditor(editor);
            return;
        }
    }
    util_1.handlePromise(atom.workspace.open(`markdown-preview-plus://${encodeURI(filePath)}`, {
        searchAllPanes: true,
    }));
}
async function copyHtml(editor) {
    const text = editor.getSelectedText() || editor.getText();
    const renderLaTeX = atom.config.get('markdown-preview-plus.enableLatexRenderingByDefault');
    const scaleMath = 100;
    return renderer.toHTML(text, editor.getPath(), editor.getGrammar(), !!renderLaTeX, true, function (error, html) {
        if (error) {
            console.warn('Copying Markdown as HTML failed', error);
        }
        else if (renderLaTeX) {
            mathjaxHelper.processHTMLString(html, function (proHTML) {
                proHTML = proHTML.replace(/MathJax\_SVG.*?font\-size\: 100%/g, (match) => match.replace(/font\-size\: 100%/, `font-size: ${scaleMath}%`));
                atom.clipboard.write(proHTML);
            });
        }
        else {
            atom.clipboard.write(html);
        }
    });
}
function configObserver(f) {
    let configDisposables;
    return function (value) {
        if (!disposables)
            return;
        if (configDisposables) {
            configDisposables.dispose();
            disposables.remove(configDisposables);
        }
        configDisposables = new atom_1.CompositeDisposable();
        const contextMenu = {};
        f(value, configDisposables, contextMenu);
        configDisposables.add(atom.contextMenu.add(contextMenu));
        disposables.add(configDisposables);
    };
}
function registerExtensions(extensions, disp, cm) {
    for (const ext of extensions) {
        const selector = `.tree-view .file .name[data-name$=".${ext}"]`;
        disp.add(atom.commands.add(selector, 'markdown-preview-plus:preview-file', previewFile));
        cm[selector] = [
            {
                label: 'Markdown Preview',
                command: 'markdown-preview-plus:preview-file',
            },
        ];
    }
}
function registerGrammars(grammars, disp, cm) {
    for (const gr of grammars) {
        const grs = gr.replace(/\./g, ' ');
        const selector = `atom-text-editor[data-grammar="${grs}"]`;
        disp.add(atom.commands.add(selector, {
            'markdown-preview-plus:toggle': (e) => {
                toggle(e.currentTarget.getModel());
            },
            'markdown-preview-plus:copy-html': (e) => {
                util_1.handlePromise(copyHtml(e.currentTarget.getModel()));
            },
        }));
        cm[selector] = [
            {
                label: 'Sync Preview',
                command: 'markdown-preview-plus:sync-preview',
            },
        ];
    }
}
function opener(uriToOpen) {
    try {
        var { protocol, host, pathname } = url.parse(uriToOpen);
    }
    catch (e) {
        console.error(e);
        return undefined;
    }
    if (protocol !== 'markdown-preview-plus:')
        return undefined;
    if (pathname === undefined)
        return undefined;
    try {
        pathname = decodeURI(pathname);
    }
    catch (e) {
        console.error(e);
        return undefined;
    }
    if (host === 'editor') {
        return new markdown_preview_view_1.MarkdownPreviewView({
            editorId: parseInt(pathname.substring(1), 10),
        });
    }
    else {
        return new markdown_preview_view_1.MarkdownPreviewView({ filePath: pathname });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTJCO0FBQzNCLG1FQUlnQztBQUNoQyx1Q0FBdUM7QUFDdkMsa0RBQWtEO0FBQ2xELGlDQUE4QztBQUM5QywrQkFNYTtBQUNiLGlDQUFrRDtBQUVsRCxtQ0FBaUM7QUFBeEIsMEJBQUEsTUFBTSxDQUFBO0FBRWYsSUFBSSxXQUE0QyxDQUFBO0FBRWhEO0lBQ0UsV0FBVyxHQUFHLElBQUksMEJBQW1CLEVBQUUsQ0FBQTtJQUN2QyxXQUFXLENBQUMsR0FBRyxDQUNiLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFO1FBQ2xDLHNEQUFzRCxFQUFFO1lBQ3RELE1BQU0sT0FBTyxHQUFHLDRDQUE0QyxDQUFBO1lBQzVELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDckQsQ0FBQztLQUNGLENBQUMsRUFDRixJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRTtRQUNyQyw4QkFBOEIsRUFBRSxLQUFLO0tBQ3RDLENBQUMsRUFDRixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQ2pCLGdDQUFnQyxFQUNoQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FDakMsRUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FDakIsa0NBQWtDLEVBQ2xDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUNuQyxDQUNGLENBQUE7QUFDSCxDQUFDO0FBdEJELDRCQXNCQztBQUVEO0lBQ0UsV0FBVyxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUN0QyxDQUFDO0FB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QUFDLENBQUMsQ0FBQztRQUN0QixNQUFNLENBQUMsSUFBSSwyQ0FBbUIsQ0FBQztZQUM3QixRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1NBQzlDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLE1BQU0sQ0FBQyxJQUFJLDJDQUFtQixDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDeEQsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdXJsID0gcmVxdWlyZSgndXJsJylcbmltcG9ydCB7XG4gIE1hcmtkb3duUHJldmlld1ZpZXcsXG4gIE1QVlBhcmFtcyxcbiAgTWFya2Rvd25QcmV2aWV3Vmlld0VsZW1lbnQsXG59IGZyb20gJy4vbWFya2Rvd24tcHJldmlldy12aWV3J1xuaW1wb3J0IHJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlcicpXG5pbXBvcnQgbWF0aGpheEhlbHBlciA9IHJlcXVpcmUoJy4vbWF0aGpheC1oZWxwZXInKVxuaW1wb3J0IHsgaXNNYXJrZG93blByZXZpZXdWaWV3IH0gZnJvbSAnLi9jYXN0J1xuaW1wb3J0IHtcbiAgVGV4dEVkaXRvcixcbiAgV29ya3NwYWNlT3Blbk9wdGlvbnMsXG4gIENvbW1hbmRFdmVudCxcbiAgQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgQ29udGV4dE1lbnVPcHRpb25zLFxufSBmcm9tICdhdG9tJ1xuaW1wb3J0IHsgaGFuZGxlUHJvbWlzZSwgaXNGaWxlU3luYyB9IGZyb20gJy4vdXRpbCdcblxuZXhwb3J0IHsgY29uZmlnIH0gZnJvbSAnLi9jb25maWcnXG5cbmxldCBkaXNwb3NhYmxlczogQ29tcG9zaXRlRGlzcG9zYWJsZSB8IHVuZGVmaW5lZFxuXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gIGRpc3Bvc2FibGVzID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKVxuICBkaXNwb3NhYmxlcy5hZGQoXG4gICAgYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20td29ya3NwYWNlJywge1xuICAgICAgJ21hcmtkb3duLXByZXZpZXctcGx1czp0b2dnbGUtYnJlYWstb24tc2luZ2xlLW5ld2xpbmUnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3Qga2V5UGF0aCA9ICdtYXJrZG93bi1wcmV2aWV3LXBsdXMuYnJlYWtPblNpbmdsZU5ld2xpbmUnXG4gICAgICAgIGF0b20uY29uZmlnLnNldChrZXlQYXRoLCAhYXRvbS5jb25maWcuZ2V0KGtleVBhdGgpKVxuICAgICAgfSxcbiAgICB9KSxcbiAgICBhdG9tLmNvbW1hbmRzLmFkZCgnLm1hcmtkb3duLXByZXZpZXcnLCB7XG4gICAgICAnbWFya2Rvd24tcHJldmlldy1wbHVzOnRvZ2dsZSc6IGNsb3NlLFxuICAgIH0pLFxuICAgIGF0b20ud29ya3NwYWNlLmFkZE9wZW5lcihvcGVuZXIpLFxuICAgIGF0b20uY29uZmlnLm9ic2VydmUoXG4gICAgICAnbWFya2Rvd24tcHJldmlldy1wbHVzLmdyYW1tYXJzJyxcbiAgICAgIGNvbmZpZ09ic2VydmVyKHJlZ2lzdGVyR3JhbW1hcnMpLFxuICAgICksXG4gICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICdtYXJrZG93bi1wcmV2aWV3LXBsdXMuZXh0ZW5zaW9ucycsXG4gICAgICBjb25maWdPYnNlcnZlcihyZWdpc3RlckV4dGVuc2lvbnMpLFxuICAgICksXG4gIClcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG4gIGRpc3Bvc2FibGVzICYmIGRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTWFya2Rvd25QcmV2aWV3VmlldyhzdGF0ZTogTVBWUGFyYW1zKSB7XG4gIGlmIChcbiAgICBzdGF0ZS5lZGl0b3JJZCAhPT0gdW5kZWZpbmVkIHx8XG4gICAgKHN0YXRlLmZpbGVQYXRoICYmIGlzRmlsZVN5bmMoc3RhdGUuZmlsZVBhdGgpKVxuICApIHtcbiAgICByZXR1cm4gbmV3IE1hcmtkb3duUHJldmlld1ZpZXcoc3RhdGUsIHRydWUpXG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZFxufVxuXG4vLy8gcHJpdmF0ZVxuXG5mdW5jdGlvbiBjbG9zZShldmVudDogQ29tbWFuZEV2ZW50PE1hcmtkb3duUHJldmlld1ZpZXdFbGVtZW50Pikge1xuICBjb25zdCBpdGVtID0gZXZlbnQuY3VycmVudFRhcmdldC5nZXRNb2RlbCgpXG4gIGNvbnN0IHBhbmUgPSBhdG9tLndvcmtzcGFjZS5wYW5lRm9ySXRlbShpdGVtKVxuICBpZiAoIXBhbmUpIHJldHVybiB1bmRlZmluZWRcbiAgcmV0dXJuIHBhbmUuZGVzdHJveUl0ZW0oaXRlbSlcbn1cblxuZnVuY3Rpb24gdG9nZ2xlKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICBpZiAoIXJlbW92ZVByZXZpZXdGb3JFZGl0b3IoZWRpdG9yKSkge1xuICAgIGFkZFByZXZpZXdGb3JFZGl0b3IoZWRpdG9yKVxuICB9XG59XG5cbmZ1bmN0aW9uIHVyaUZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgcmV0dXJuIGBtYXJrZG93bi1wcmV2aWV3LXBsdXM6Ly9lZGl0b3IvJHtlZGl0b3IuaWR9YFxufVxuXG5mdW5jdGlvbiByZW1vdmVQcmV2aWV3Rm9yRWRpdG9yKGVkaXRvcjogVGV4dEVkaXRvcikge1xuICBjb25zdCB1cmkgPSB1cmlGb3JFZGl0b3IoZWRpdG9yKVxuICBjb25zdCBwcmV2aWV3UGFuZSA9IGF0b20ud29ya3NwYWNlLnBhbmVGb3JVUkkodXJpKVxuICBpZiAocHJldmlld1BhbmUgIT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IHByZXZpZXcgPSBwcmV2aWV3UGFuZS5pdGVtRm9yVVJJKHVyaSlcbiAgICBpZiAocHJldmlldyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2VcbiAgICBpZiAocHJldmlldyAhPT0gcHJldmlld1BhbmUuZ2V0QWN0aXZlSXRlbSgpKSB7XG4gICAgICBwcmV2aWV3UGFuZS5hY3RpdmF0ZUl0ZW0ocHJldmlldylcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICBoYW5kbGVQcm9taXNlKHByZXZpZXdQYW5lLmRlc3Ryb3lJdGVtKHByZXZpZXcpKVxuICAgIHJldHVybiB0cnVlXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkUHJldmlld0ZvckVkaXRvcihlZGl0b3I6IFRleHRFZGl0b3IpIHtcbiAgY29uc3QgdXJpID0gdXJpRm9yRWRpdG9yKGVkaXRvcilcbiAgY29uc3QgcHJldmlvdXNBY3RpdmVQYW5lID0gYXRvbS53b3Jrc3BhY2UuZ2V0QWN0aXZlUGFuZSgpXG4gIGNvbnN0IG9wdGlvbnM6IFdvcmtzcGFjZU9wZW5PcHRpb25zID0geyBzZWFyY2hBbGxQYW5lczogdHJ1ZSB9XG4gIGlmIChhdG9tLmNvbmZpZy5nZXQoJ21hcmtkb3duLXByZXZpZXctcGx1cy5vcGVuUHJldmlld0luU3BsaXRQYW5lJykpIHtcbiAgICBvcHRpb25zLnNwbGl0ID0gYXRvbS5jb25maWcuZ2V0KFxuICAgICAgJ21hcmtkb3duLXByZXZpZXctcGx1cy5wcmV2aWV3U3BsaXRQYW5lRGlyJyxcbiAgICApIVxuICB9XG4gIGhhbmRsZVByb21pc2UoXG4gICAgYXRvbS53b3Jrc3BhY2Uub3Blbih1cmksIG9wdGlvbnMpLnRoZW4oZnVuY3Rpb24obWFya2Rvd25QcmV2aWV3Vmlldykge1xuICAgICAgaWYgKGlzTWFya2Rvd25QcmV2aWV3VmlldyhtYXJrZG93blByZXZpZXdWaWV3KSkge1xuICAgICAgICBwcmV2aW91c0FjdGl2ZVBhbmUuYWN0aXZhdGUoKVxuICAgICAgfVxuICAgIH0pLFxuICApXG59XG5cbmZ1bmN0aW9uIHByZXZpZXdGaWxlKHsgY3VycmVudFRhcmdldCB9OiBDb21tYW5kRXZlbnQpIHtcbiAgY29uc3QgZmlsZVBhdGggPSAoY3VycmVudFRhcmdldCBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5wYXRoXG4gIGlmICghZmlsZVBhdGgpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGZvciAoY29uc3QgZWRpdG9yIG9mIGF0b20ud29ya3NwYWNlLmdldFRleHRFZGl0b3JzKCkpIHtcbiAgICBpZiAoZWRpdG9yLmdldFBhdGgoKSA9PT0gZmlsZVBhdGgpIHtcbiAgICAgIGFkZFByZXZpZXdGb3JFZGl0b3IoZWRpdG9yKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICB9XG5cbiAgaGFuZGxlUHJvbWlzZShcbiAgICBhdG9tLndvcmtzcGFjZS5vcGVuKGBtYXJrZG93bi1wcmV2aWV3LXBsdXM6Ly8ke2VuY29kZVVSSShmaWxlUGF0aCl9YCwge1xuICAgICAgc2VhcmNoQWxsUGFuZXM6IHRydWUsXG4gICAgfSksXG4gIClcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29weUh0bWwoZWRpdG9yOiBUZXh0RWRpdG9yKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHRleHQgPSBlZGl0b3IuZ2V0U2VsZWN0ZWRUZXh0KCkgfHwgZWRpdG9yLmdldFRleHQoKVxuICBjb25zdCByZW5kZXJMYVRlWCA9IGF0b20uY29uZmlnLmdldChcbiAgICAnbWFya2Rvd24tcHJldmlldy1wbHVzLmVuYWJsZUxhdGV4UmVuZGVyaW5nQnlEZWZhdWx0JyxcbiAgKVxuICBjb25zdCBzY2FsZU1hdGggPSAxMDBcbiAgcmV0dXJuIHJlbmRlcmVyLnRvSFRNTChcbiAgICB0ZXh0LFxuICAgIGVkaXRvci5nZXRQYXRoKCksXG4gICAgZWRpdG9yLmdldEdyYW1tYXIoKSxcbiAgICAhIXJlbmRlckxhVGVYLFxuICAgIHRydWUsXG4gICAgZnVuY3Rpb24oZXJyb3I6IEVycm9yIHwgbnVsbCwgaHRtbDogc3RyaW5nKSB7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdDb3B5aW5nIE1hcmtkb3duIGFzIEhUTUwgZmFpbGVkJywgZXJyb3IpXG4gICAgICB9IGVsc2UgaWYgKHJlbmRlckxhVGVYKSB7XG4gICAgICAgIG1hdGhqYXhIZWxwZXIucHJvY2Vzc0hUTUxTdHJpbmcoaHRtbCwgZnVuY3Rpb24ocHJvSFRNTDogc3RyaW5nKSB7XG4gICAgICAgICAgcHJvSFRNTCA9IHByb0hUTUwucmVwbGFjZShcbiAgICAgICAgICAgIC9NYXRoSmF4XFxfU1ZHLio/Zm9udFxcLXNpemVcXDogMTAwJS9nLFxuICAgICAgICAgICAgKG1hdGNoKSA9PlxuICAgICAgICAgICAgICBtYXRjaC5yZXBsYWNlKC9mb250XFwtc2l6ZVxcOiAxMDAlLywgYGZvbnQtc2l6ZTogJHtzY2FsZU1hdGh9JWApLFxuICAgICAgICAgIClcbiAgICAgICAgICBhdG9tLmNsaXBib2FyZC53cml0ZShwcm9IVE1MKVxuICAgICAgICB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXRvbS5jbGlwYm9hcmQud3JpdGUoaHRtbClcbiAgICAgIH1cbiAgICB9LFxuICApXG59XG5cbnR5cGUgQ29udGV4dE1lbnUgPSB7IFtrZXk6IHN0cmluZ106IENvbnRleHRNZW51T3B0aW9uc1tdIH1cblxuZnVuY3Rpb24gY29uZmlnT2JzZXJ2ZXI8VD4oXG4gIGY6IChcbiAgICB2YWx1ZTogVCxcbiAgICBkaXNwb3NhYmxlczogQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgICBjb250ZXh0TWVudTogQ29udGV4dE1lbnUsXG4gICkgPT4gdm9pZCxcbikge1xuICBsZXQgY29uZmlnRGlzcG9zYWJsZXM6IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlOiBUKSB7XG4gICAgaWYgKCFkaXNwb3NhYmxlcykgcmV0dXJuXG4gICAgaWYgKGNvbmZpZ0Rpc3Bvc2FibGVzKSB7XG4gICAgICBjb25maWdEaXNwb3NhYmxlcy5kaXNwb3NlKClcbiAgICAgIGRpc3Bvc2FibGVzLnJlbW92ZShjb25maWdEaXNwb3NhYmxlcylcbiAgICB9XG4gICAgY29uZmlnRGlzcG9zYWJsZXMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpXG4gICAgY29uc3QgY29udGV4dE1lbnU6IENvbnRleHRNZW51ID0ge31cbiAgICBmKHZhbHVlLCBjb25maWdEaXNwb3NhYmxlcywgY29udGV4dE1lbnUpXG4gICAgY29uZmlnRGlzcG9zYWJsZXMuYWRkKGF0b20uY29udGV4dE1lbnUuYWRkKGNvbnRleHRNZW51KSlcbiAgICBkaXNwb3NhYmxlcy5hZGQoY29uZmlnRGlzcG9zYWJsZXMpXG4gIH1cbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJFeHRlbnNpb25zKFxuICBleHRlbnNpb25zOiBzdHJpbmdbXSxcbiAgZGlzcDogQ29tcG9zaXRlRGlzcG9zYWJsZSxcbiAgY206IENvbnRleHRNZW51LFxuKSB7XG4gIGZvciAoY29uc3QgZXh0IG9mIGV4dGVuc2lvbnMpIHtcbiAgICBjb25zdCBzZWxlY3RvciA9IGAudHJlZS12aWV3IC5maWxlIC5uYW1lW2RhdGEtbmFtZSQ9XCIuJHtleHR9XCJdYFxuICAgIGRpc3AuYWRkKFxuICAgICAgYXRvbS5jb21tYW5kcy5hZGQoXG4gICAgICAgIHNlbGVjdG9yLFxuICAgICAgICAnbWFya2Rvd24tcHJldmlldy1wbHVzOnByZXZpZXctZmlsZScsXG4gICAgICAgIHByZXZpZXdGaWxlLFxuICAgICAgKSxcbiAgICApXG4gICAgY21bc2VsZWN0b3JdID0gW1xuICAgICAge1xuICAgICAgICBsYWJlbDogJ01hcmtkb3duIFByZXZpZXcnLFxuICAgICAgICBjb21tYW5kOiAnbWFya2Rvd24tcHJldmlldy1wbHVzOnByZXZpZXctZmlsZScsXG4gICAgICB9LFxuICAgIF1cbiAgfVxufVxuXG5mdW5jdGlvbiByZWdpc3RlckdyYW1tYXJzKFxuICBncmFtbWFyczogc3RyaW5nW10sXG4gIGRpc3A6IENvbXBvc2l0ZURpc3Bvc2FibGUsXG4gIGNtOiBDb250ZXh0TWVudSxcbikge1xuICBmb3IgKGNvbnN0IGdyIG9mIGdyYW1tYXJzKSB7XG4gICAgY29uc3QgZ3JzID0gZ3IucmVwbGFjZSgvXFwuL2csICcgJylcbiAgICBjb25zdCBzZWxlY3RvciA9IGBhdG9tLXRleHQtZWRpdG9yW2RhdGEtZ3JhbW1hcj1cIiR7Z3JzfVwiXWBcbiAgICBkaXNwLmFkZChcbiAgICAgIGF0b20uY29tbWFuZHMuYWRkKHNlbGVjdG9yIGFzICdhdG9tLXRleHQtZWRpdG9yJywge1xuICAgICAgICAnbWFya2Rvd24tcHJldmlldy1wbHVzOnRvZ2dsZSc6IChlKSA9PiB7XG4gICAgICAgICAgdG9nZ2xlKGUuY3VycmVudFRhcmdldC5nZXRNb2RlbCgpKVxuICAgICAgICB9LFxuICAgICAgICAnbWFya2Rvd24tcHJldmlldy1wbHVzOmNvcHktaHRtbCc6IChlKSA9PiB7XG4gICAgICAgICAgaGFuZGxlUHJvbWlzZShjb3B5SHRtbChlLmN1cnJlbnRUYXJnZXQuZ2V0TW9kZWwoKSkpXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgICApXG4gICAgY21bc2VsZWN0b3JdID0gW1xuICAgICAge1xuICAgICAgICBsYWJlbDogJ1N5bmMgUHJldmlldycsXG4gICAgICAgIGNvbW1hbmQ6ICdtYXJrZG93bi1wcmV2aWV3LXBsdXM6c3luYy1wcmV2aWV3JyxcbiAgICAgIH0sXG4gICAgXVxuICB9XG59XG5cbmZ1bmN0aW9uIG9wZW5lcih1cmlUb09wZW46IHN0cmluZykge1xuICB0cnkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby12YXIta2V5d29yZCBwcmVmZXItY29uc3RcbiAgICB2YXIgeyBwcm90b2NvbCwgaG9zdCwgcGF0aG5hbWUgfSA9IHVybC5wYXJzZSh1cmlUb09wZW4pXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGUpXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgaWYgKHByb3RvY29sICE9PSAnbWFya2Rvd24tcHJldmlldy1wbHVzOicpIHJldHVybiB1bmRlZmluZWRcbiAgaWYgKHBhdGhuYW1lID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWRcblxuICB0cnkge1xuICAgIHBhdGhuYW1lID0gZGVjb2RlVVJJKHBhdGhuYW1lKVxuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcihlKVxuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuXG4gIGlmIChob3N0ID09PSAnZWRpdG9yJykge1xuICAgIHJldHVybiBuZXcgTWFya2Rvd25QcmV2aWV3Vmlldyh7XG4gICAgICBlZGl0b3JJZDogcGFyc2VJbnQocGF0aG5hbWUuc3Vic3RyaW5nKDEpLCAxMCksXG4gICAgfSlcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IE1hcmtkb3duUHJldmlld1ZpZXcoeyBmaWxlUGF0aDogcGF0aG5hbWUgfSlcbiAgfVxufVxuIl19