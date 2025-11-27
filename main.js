const { Plugin, Modal, MarkdownView, Setting, PluginSettingTab, Menu } = require('obsidian');

class EmoticonPickerModal extends Modal {
  constructor(app, plugin, dataset) {
    super(app);
    this.plugin = plugin;
    this.dataset = dataset;
    this.query = '';
    this.section = plugin.settings && plugin.settings.defaultSection ? plugin.settings.defaultSection : 'all';
    this.focusIndex = 0;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('emoticon-picker');

    const header = contentEl.createEl('div');
    header.addClass('emoticon-picker__header');

    const title = header.createEl('h2', { text: 'Emoticon Picker' });
    title.style.marginTop = '-10px';
    title.style.marginBottom = '20px';
    title.addClass('emoticon-picker__title');

    const input = header.createEl('input', { type: 'text', placeholder: 'Search emoticons or tags' });
    input.addClass('emoticon-picker__search');
    input.value = this.query;

    const tabs = header.createEl('div');
    tabs.addClass('emoticon-picker__tabs');
    const makeTab = (key, label) => {
      const t = tabs.createEl('button', { text: label });
      t.addClass('emoticon-picker__tab');
      t.onclick = () => {
        this.section = key;
        this.focusIndex = 0; // Reset focus when switching tabs
        render();
      };
      return t;
    };
    const tabAll = makeTab('all', 'All');
    const tabFav = makeTab('fav', 'Favourites');
    const tabRec = makeTab('rec', 'Recents');
    const tabCus = makeTab('custom', 'Custom');
    const tabHappy = makeTab('happy', 'Happy');
    const tabSad = makeTab('sad', 'Sad');
    const tabExc = makeTab('excited', 'Excited');
    const tabAng = makeTab('angry', 'Angry');
    const tabStr = makeTab('stressed', 'Stressed');

    const body = contentEl.createEl('div');
    body.addClass('emoticon-picker__body');

    const grid = body.createEl('div');
    grid.addClass('emoticon-picker__grid');

    let buttons = [];
    const render = () => {
      [tabAll, tabFav, tabRec, tabCus, tabHappy, tabSad, tabExc, tabAng, tabStr].forEach(t => t.removeClass('is-active'));
      if (this.section === 'all') tabAll.addClass('is-active');
      if (this.section === 'fav') tabFav.addClass('is-active');
      if (this.section === 'rec') tabRec.addClass('is-active');
      if (this.section === 'custom') tabCus.addClass('is-active');
      if (this.section === 'happy') tabHappy.addClass('is-active');
      if (this.section === 'sad') tabSad.addClass('is-active');
      if (this.section === 'excited') tabExc.addClass('is-active');
      if (this.section === 'angry') tabAng.addClass('is-active');
      if (this.section === 'stressed') tabStr.addClass('is-active');

      grid.empty();
      let baseItems = [];
      if (this.section === 'all') baseItems = this.dataset;
      if (this.section === 'fav') baseItems = this.plugin.settings.favourites.map(text => ({ text, tags: ['favourite'] }));
      if (this.section === 'rec') baseItems = this.plugin.settings.showRecents ? this.plugin.settings.recents.map(text => ({ text, tags: ['recent'] })) : [];
      if (this.section === 'custom') baseItems = (this.plugin.settings.custom || []);
      if (this.section === 'happy') baseItems = this.dataset.filter(it => (it.tags || []).includes('happy'));
      if (this.section === 'sad') baseItems = this.dataset.filter(it => (it.tags || []).includes('sad'));
      if (this.section === 'excited') baseItems = this.dataset.filter(it => (it.tags || []).includes('excited'));
      if (this.section === 'angry') baseItems = this.dataset.filter(it => (it.tags || []).includes('angry'));
      if (this.section === 'stressed') baseItems = this.dataset.filter(it => (it.tags || []).includes('stressed'));
      baseItems = baseItems.filter(it => !this.plugin.isHidden(it.text));
      const sorted = sortDataset(filterDataset(baseItems, input.value), input.value);
      const favFirst = [];
      const rest = [];
      sorted.forEach(it => (this.plugin.isFavourite(it.text) ? favFirst : rest).push(it));
      const items = favFirst.concat(rest);
      items.forEach(item => {
        const card = grid.createEl('div');
        card.addClass('emoticon-picker__card');
        const btn = card.createEl('button', { text: item.text });
        btn.addClass('emoticon-picker__item');
        btn.setAttr('type', 'button');
        btn.setAttr('tabindex', '0');
        btn.onclick = () => {
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          if (view && view.editor) view.editor.replaceSelection(item.text);
          this.plugin.pushRecent(item.text);
          this.close();
        };
        if (this.plugin.isFavourite(item.text)) {
          const star = card.createEl('div', { text: '★' });
          star.addClass('emoticon-picker__star');
        }
        btn.oncontextmenu = (e) => {
          e.preventDefault();
          if (Menu && typeof Menu === 'function') {
            const menu = new Menu(this.app);
            if (this.plugin.isFavourite(item.text)) {
              menu.addItem(mi => mi.setTitle('Unfavourite').setIcon('star').onClick(() => { this.plugin.removeFavourite(item.text); render(); }));
            } else {
              menu.addItem(mi => mi.setTitle('Favourite').setIcon('star').onClick(() => { this.plugin.addFavourite(item.text); render(); }));
            }
            menu.addItem(mi => mi.setTitle('Copy to clipboard').setIcon('copy').onClick(async () => {
              try {
                if (navigator && navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(item.text);
                else {
                  const ta = document.createElement('textarea');
                  ta.value = item.text;
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  document.body.removeChild(ta);
                }
              } catch (_) {}
            }));
            menu.addItem(mi => mi.setTitle('Hide').setIcon('trash').onClick(() => { this.plugin.addHidden(item.text); render(); }));
            const isCustom = (this.plugin.settings.custom || []).some(it => it.text === item.text);
            if (isCustom) {
              menu.addItem(mi => mi.setTitle('Delete custom').setIcon('trash').onClick(() => { this.plugin.removeCustom(item.text); render(); }));
            }
            menu.showAtMouseEvent(e);
          } else {
            if (this.plugin.isFavourite(item.text)) this.plugin.removeFavourite(item.text);
            else this.plugin.addFavourite(item.text);
            render();
          }
        };
      });
      if (items.length === 0) {
        grid.createEl('div', { text: 'No matches' }).addClass('emoticon-picker__empty');
      }
      buttons = Array.from(grid.querySelectorAll('.emoticon-picker__item'));
      // Ensure focusIndex is valid
      if (this.focusIndex >= buttons.length) this.focusIndex = 0;
      if (buttons.length > 0 && this.focusIndex >= 0) { buttons[this.focusIndex].focus(); }
      
      // Determine which emoticons should be wide based on character length
      requestAnimationFrame(() => {
        const cards = Array.from(grid.querySelectorAll('.emoticon-picker__card'));
        cards.forEach(c => {
          const b = c.querySelector('.emoticon-picker__item');
          if (!b) return;
          const text = b.textContent || '';
          // Only emoticons longer than 12 characters will take the full row
          if (text.length > 12) {
            c.classList.add('is-wide');
          } else {
            c.classList.remove('is-wide');
          }
        });
      });
    };

    input.oninput = () => {
      this.focusIndex = 0; // Reset focus when searching
      render();
    };
    render();

    const computeRows = () => {
      const btns = Array.from(grid.querySelectorAll('.emoticon-picker__item'));
      const rows = [];
      let currentTop = null;
      let row = [];
      btns.forEach(b => {
        const t = b.getBoundingClientRect().top;
        if (currentTop === null || Math.abs(t - currentTop) < 5) {
          currentTop = currentTop === null ? t : currentTop;
          row.push(b);
        } else {
          rows.push(row);
          row = [b];
          currentTop = t;
        }
      });
      if (row.length) rows.push(row);
      return rows;
    };

    this.contentEl.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' && e.target.classList.contains('emoticon-picker__search')) return;
      if (!buttons.length) return;
      let idx = buttons.indexOf(document.activeElement);
      if (idx < 0) idx = this.focusIndex;
      const rows = computeRows();
      const findRowCol = (index) => {
        let acc = 0;
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          if (index < acc + row.length) return { r, c: index - acc };
          acc += row.length;
        }
        return { r: 0, c: 0 };
      };
      const clamp = (i) => Math.max(0, Math.min(i, buttons.length - 1));
      let handled = false;
      if (e.key === 'ArrowLeft') { 
        idx = clamp(idx - 1); 
        handled = true; 
      }
      else if (e.key === 'ArrowRight') { 
        idx = clamp(idx + 1); 
        handled = true; 
      }
      else if (e.key === 'ArrowUp') {
        const { r, c } = findRowCol(idx);
        if (r > 0) {
          const prev = rows[r - 1];
          const col = Math.min(c, prev.length - 1);
          let acc = 0; 
          for (let i = 0; i < r - 1; i++) acc += rows[i].length;
          idx = acc + col;
        } else { 
          idx = clamp(idx - 1); 
        }
        handled = true;
      } else if (e.key === 'ArrowDown') {
        const { r, c } = findRowCol(idx);
        if (r < rows.length - 1) {
          const next = rows[r + 1];
          const col = Math.min(c, next.length - 1);
          let acc = 0; 
          for (let i = 0; i <= r; i++) acc += rows[i].length;
          idx = acc + col;
        } else { 
          idx = clamp(idx + 1); 
        }
        handled = true;
      } else if (e.key === 'Enter') {
        buttons[idx].click();
        handled = true;
      }
      if (handled) {
        this.focusIndex = idx;
        buttons[idx].focus();
        e.preventDefault();
        e.stopPropagation();
      }
    });
    this._resizeHandler = () => { requestAnimationFrame(() => {
      // Determine which emoticons should be wide
      const cards = Array.from(grid.querySelectorAll('.emoticon-picker__card'));
      cards.forEach(c => {
        const b = c.querySelector('.emoticon-picker__item');
        if (!b) return;
        const text = b.textContent || '';
        // Only emoticons longer than 12 characters will take the full row
        if (text.length > 12) {
          c.classList.add('is-wide');
        } else {
          c.classList.remove('is-wide');
        }
      });
    }); };
    window.addEventListener('resize', this._resizeHandler);
  }

  onClose() {
    this.contentEl.empty();
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
  }
}

function filterDataset(ds, q) {
  const query = (q || '').trim().toLowerCase();
  if (!query) return ds;
  const tokens = query.split(/\s+/).filter(Boolean);
  return ds.filter(item => {
    const hay = [item.text.toLowerCase(), ...item.tags.map(t => t.toLowerCase())].join(' ');
    return tokens.every(tok => hay.includes(tok));
  });
}

function sortDataset(ds, q) {
  const query = (q || '').trim().toLowerCase();
  if (!query) return [...ds].sort((a, b) => a.text.localeCompare(b.text));
  const score = (it) => {
    const t = it.text.toLowerCase();
    const tags = (it.tags || []).map(x => x.toLowerCase());
    let s = 0;
    if (t === query) s += 100;
    if (t.startsWith(query)) s += 60;
    if (t.includes(query)) s += 40;
    if (tags.includes(query)) s += 30;
    if (tags.some(x => x.includes(query))) s += 20;
    return s;
  };
  return [...ds].sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    if (sa !== sb) return sb - sa;
    return a.text.localeCompare(b.text);
  });
}

class EmoticonPickerSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName('Show recents')
      .setDesc('Toggle the recents section in the picker')
      .addToggle(t => t.setValue(this.plugin.settings.showRecents).onChange(async v => { this.plugin.settings.showRecents = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl)
      .setName('Custom emoticons')
      .setDesc('Add emoticons as lines; use "text | tag1,tag2"')
      .addTextArea(t => {
        t.setValue(this.plugin.serializeCustom()).onChange(async v => { this.plugin.parseAndSetCustom(v); await this.plugin.saveSettings(); });
        t.inputEl.rows = 8;
      });
    const addRow = new Setting(containerEl)
      .setName('Add emoticon')
      .setDesc('Create an emoticon and tags');
    let newText = '';
    let newTags = '';
    addRow.addText(t => t.setPlaceholder('emoticon text').setValue('').onChange(v => { newText = v; }));
    addRow.addText(t => t.setPlaceholder('tags, comma-separated').setValue('').onChange(v => { newTags = v; }));
    addRow.addExtraButton(b => b.setIcon('plus').setTooltip('Add').onClick(async () => {
      const text = (newText || '').trim();
      const tags = (newTags || '').split(',').map(x => x.trim()).filter(Boolean);
      if (!text) return;
      const exists = (this.plugin.settings.custom || []).some(it => it.text === text);
      if (!exists) {
        const arr = this.plugin.settings.custom || [];
        arr.unshift({ text, tags });
        this.plugin.settings.custom = arr;
        await this.plugin.saveSettings();
        this.display();
      }
    }));
    new Setting(containerEl)
      .setName('Hidden emoticons')
      .setDesc('Manage hidden emoticons')
      .addTextArea(t => {
        t.setValue((this.plugin.settings.hidden || []).join('\n')).onChange(async v => { this.plugin.settings.hidden = v.split(/\n/).map(s => s.trim()).filter(Boolean); await this.plugin.saveSettings(); });
        t.inputEl.rows = 6;
      })
      .addExtraButton(b => b.setIcon('reset').setTooltip('Unhide all').onClick(async () => { this.plugin.settings.hidden = []; await this.plugin.saveSettings(); this.display(); }));
    new Setting(containerEl)
      .setName('Default section')
      .setDesc('Choose which tab opens by default')
      .addDropdown(d => {
        d.addOptions({ all: 'All', fav: 'Favourites', rec: 'Recents', custom: 'Custom', happy: 'Happy', sad: 'Sad', excited: 'Excited', angry: 'Angry', stressed: 'Stressed' });
        d.setValue(this.plugin.settings.defaultSection || 'all').onChange(async v => { this.plugin.settings.defaultSection = v; await this.plugin.saveSettings(); });
      });
  }
}

module.exports = class EmoticonPickerPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    await this.loadDataset();
    this.addRibbonIcon('smile', 'Emoticon Picker', () => this.openPicker());
    this.addCommand({ id: 'open-emoticon-picker', name: 'Open Emoticon Picker', callback: () => this.openPicker() });
    this.addSettingTab(new EmoticonPickerSettingTab(this.app, this));
  }

  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({ showRecents: true, favourites: [], recents: [], custom: [], hidden: [], defaultSection: 'all' }, data || {});
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async loadDataset() {
    this.dataset = [];
    try {
      const data = require('./emoticons.json');
      if (Array.isArray(data)) this.dataset = data;
    } catch (e) {
      try {
        const path = '.obsidian/plugins/emoticon-picker/emoticons.json';
        const txt = await this.app.vault.adapter.read(path);
        const parsed = JSON.parse(txt);
        if (Array.isArray(parsed)) this.dataset = parsed;
      } catch (_) {
        this.dataset = [];
      }
    }
  }

  openPicker() {
    const base = Array.isArray(this.dataset) ? this.dataset : [];
    const modal = new EmoticonPickerModal(this.app, this, base.concat(this.settings.custom || []));
    modal.open();
  }

  addFavourite(text) {
    if (!this.settings.favourites.includes(text)) this.settings.favourites.unshift(text);
    this.settings.favourites = Array.from(new Set(this.settings.favourites)).slice(0, 200);
    this.saveSettings();
  }

  removeFavourite(text) {
    this.settings.favourites = this.settings.favourites.filter(t => t !== text);
    this.saveSettings();
  }

  isFavourite(text) {
    return this.settings.favourites.includes(text);
  }

  addHidden(text) {
    if (!this.settings.hidden.includes(text)) this.settings.hidden.unshift(text);
    this.settings.hidden = Array.from(new Set(this.settings.hidden)).slice(0, 500);
    this.saveSettings();
  }

  removeHidden(text) {
    this.settings.hidden = this.settings.hidden.filter(t => t !== text);
    this.saveSettings();
  }

  isHidden(text) {
    return this.settings.hidden.includes(text);
  }

  pushRecent(text) {
    if (!this.settings.showRecents) return;
    this.settings.recents.unshift(text);
    const set = new Set();
    const filtered = [];
    for (const t of this.settings.recents) {
      if (!set.has(t)) { set.add(t); filtered.push(t); }
    }
    this.settings.recents = filtered.slice(0, 50);
    this.saveSettings();
  }

  serializeCustom() {
    const lines = (this.settings.custom || []).map(it => `${it.text} | ${(it.tags || []).join(',')}`);
    return lines.join('\n');
  }

  parseAndSetCustom(v) {
    const out = [];
    const lines = (v || '').split(/\n/);
    lines.forEach(line => {
      const s = line.trim();
      if (!s) return;
      const parts = s.split('|');
      const text = parts[0].trim();
      const tags = parts[1] ? parts[1].split(',').map(x => x.trim()).filter(Boolean) : [];
      out.push({ text, tags });
    });
    this.settings.custom = out;
  }

  removeCustom(text) {
    this.settings.custom = (this.settings.custom || []).filter(it => it.text !== text);
    this.saveSettings();
  }
};
