// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  JSONValue
} from 'phosphor/lib/algorithm/json';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  TabPanel
} from 'phosphor/lib/ui/tabpanel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  simulate
} from 'simulate-event';

import {
  IChangedArgs
} from '../../../lib/common/interfaces';

import {
  BaseCellWidget
} from '../../../lib/cells';

import {
 ICellTools, CellTools, NotebookPanel, NotebookTracker, NotebookActions
} from '../../../lib/notebook';

import {
  createNotebookPanel, populateNotebook
} from './utils';


class LogCellTool extends CellTools.BaseCellTool {

  methods: string[] = [];

  protected onAfterAttach(message: Message): void {
    super.onAfterAttach(message);
    this.methods.push('onAfterAttach');
  }

  protected onActiveCellChanged(sender: ICellTools, args: BaseCellWidget): void {
    super.onActiveCellChanged(sender, args);
    this.methods.push('onActiveCellChanged');
  }

  protected onSelectionChanged(sender: ICellTools): void {
    super.onSelectionChanged(sender);
    this.methods.push('onSelectionChanged');
  }

  protected onMetadataChanged(sender: ICellTools, args: IChangedArgs<JSONValue>): void {
    super.onMetadataChanged(sender, args);
    this.methods.push('onMetadataChanged');
  }
}


class LogKeySelector extends CellTools.KeySelector {

  events: string[] = [];
  methods: string[] = [];

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.events.push(event.type);
  }

  protected onAfterAttach(message: Message): void {
    super.onAfterAttach(message);
    this.methods.push('onAfterAttach');
  }

  protected onBeforeDetach(message: Message): void {
    super.onBeforeDetach(message);
    this.methods.push('onBeforeDetach');
  }

  protected onValueChanged(): void {
    super.onValueChanged();
    this.methods.push('onValueChanged');
  }

  protected onActiveCellChanged(sender: ICellTools, args: BaseCellWidget): void {
    super.onActiveCellChanged(sender, args);
    this.methods.push('onActiveCellChanged');
  }

  protected onMetadataChanged(sender: ICellTools, args: IChangedArgs<JSONValue>): void {
    super.onMetadataChanged(sender, args);
    this.methods.push('onMetadataChanged');
  }
}


describe('notebook/celltools', () => {

  let celltools: CellTools;
  let tabpanel: TabPanel;
  let tracker: NotebookTracker;
  let panel0: NotebookPanel;
  let panel1: NotebookPanel;

  beforeEach((done) => {
    tracker = new NotebookTracker({ namespace: 'notebook' });
    panel0 = createNotebookPanel();
    populateNotebook(panel0.notebook);
    panel1 = createNotebookPanel();
    populateNotebook(panel1.notebook);
    tracker.add(panel0);
    tracker.add(panel1);
    celltools = new CellTools({ tracker });
    tabpanel = new TabPanel();
    tabpanel.addWidget(panel0);
    tabpanel.addWidget(panel1);
    tabpanel.addWidget(celltools);
    tabpanel.node.style.height = '800px';
    Widget.attach(tabpanel, document.body);
    tabpanel.currentIndex = 0;
    // Wait for posted messages.
    requestAnimationFrame(() => {
      done();
    });
  });

  afterEach(() => {
    tabpanel.dispose();
    celltools.dispose();
  });

  describe('CellTools', () => {

    describe('#constructor()', () => {

      it('should create a celltools object', () => {
        expect(celltools).to.be.a(CellTools);
      });

    });

    describe('#activeCellChanged', () => {

      it('should be emitted when the active cell changes', () => {
        let called = false;
        celltools.activeCellChanged.connect((sender, cell) => {
          expect(sender).to.be(celltools);
          expect(panel0.node.contains(cell.node)).to.be(true);
          called = true;
        });
        simulate(panel0.node, 'focus');
        expect(called).to.be(true);
      });

      it('should be emitted when the active notebook changes', () => {
        let called = false;
        simulate(panel0.node, 'focus');
        celltools.activeCellChanged.connect((sender, cell) => {
          expect(sender).to.be(celltools);
          expect(panel1.node.contains(cell.node)).to.be(true);
          called = true;
        });
        tabpanel.currentIndex = 1;
        simulate(panel1.node, 'focus');
        expect(called).to.be(true);
      });

    });

    describe('#selectionChanged', () => {

      it('should be emitted when the selection changes', () => {
        let called = false;
        simulate(panel0.node, 'focus');
        celltools.selectionChanged.connect((sender) => {
          expect(sender).to.be(celltools);
          called = true;
        });
        panel0.notebook.select(panel0.notebook.widgets.at(1));
        expect(called).to.be(true);
      });

    });

    describe('#metadataChanged', () => {

      it('should be emitted when the metadata changes', () => {
        let called = false;
        simulate(panel0.node, 'focus');
        celltools.metadataChanged.connect((sender, args) => {
          expect(sender).to.be(celltools);
          expect(args.name).to.be('foo');
          expect(args.oldValue).to.be(void 0);
          expect(args.newValue).to.be(1);
          called = true;
        });
        let cursor = celltools.activeCell.model.getMetadata('foo');
        cursor.setValue(1);
        expect(called).to.be(true);
      });

    });

    describe('#activeCell', () => {

      it('should be the active cell', () => {
        expect(celltools.activeCell).to.be(null);
        simulate(panel0.node, 'focus');
        expect(celltools.activeCell).to.be(panel0.notebook.activeCell);
        tabpanel.currentIndex = 1;
        simulate(panel1.node, 'focus');
        expect(celltools.activeCell).to.be(panel1.notebook.activeCell);
      });

    });

    describe('#selectedCells', () => {

      it('should be the currently selected cells', () => {
        expect(celltools.selectedCells.length).to.be(0);
        simulate(panel0.node, 'focus');
        expect(celltools.selectedCells).to.eql([panel0.notebook.activeCell]);
        tabpanel.currentIndex = 1;
        simulate(panel1.node, 'focus');
        expect(celltools.selectedCells).to.eql([panel1.notebook.activeCell]);
        panel1.notebook.select(panel1.notebook.widgets.at(1));
        expect(celltools.selectedCells.length).to.be(2);
      });

    });

    describe('#addItem()', () => {

      it('should add a cell tool item', () => {
        let widget = new Widget();
        celltools.addItem({ widget });
        widget.dispose();
      });

      it('should accept a rank', () => {
        let widget = new Widget();
        celltools.addItem({ widget, rank: 100 });
        widget.dispose();
      });

    });

  });

  describe('CellTools.BaseCellTool', () => {

    describe('#constructor', () => {

      it('should create a new base tool', () => {
        let tool = new CellTools.BaseCellTool({ celltools });
        expect(tool).to.be.a(CellTools.BaseCellTool);
      });

    });

    describe('#celltools', () => {

      it('should be the celltools object used by the tool', () => {
        let tool = new CellTools.BaseCellTool({ celltools });
        expect(tool.celltools).to.be(celltools);
      });

    });

    describe('#onAfterAttach()', () => {

      it('should call onActiveCellChanged', () => {
        let tool = new LogCellTool({ celltools });
        expect(tool.methods).to.not.contain('onAfterAttach');
        expect(tool.methods).to.not.contain('onActiveCellChanged');
        Widget.attach(tool, document.body);
        expect(tool.methods).to.contain('onAfterAttach');
        expect(tool.methods).to.contain('onActiveCellChanged');
      });

    });

    describe('#onActiveCellChanged()', () => {

      it('should be called when the active cell changes', () => {
        let tool = new LogCellTool({ celltools });
        celltools.addItem({ widget: tool });
        tool.methods = [];
        simulate(panel0.node, 'focus');
        expect(tool.methods).to.contain('onActiveCellChanged');
      });

    });

    describe('#onSelectionChanged()', () => {

      it('should be called when the selection changes', () => {
        let tool = new LogCellTool({ celltools });
        celltools.addItem({ widget: tool });
        simulate(panel0.node, 'focus');
        tool.methods = [];
        panel0.notebook.select(panel0.notebook.widgets.at(1));
        expect(tool.methods).to.contain('onSelectionChanged');
      });

    });

    describe('#onMetadataChanged()', () => {

      it('should be called when the metadata changes', () => {
        let tool = new LogCellTool({ celltools });
        celltools.addItem({ widget: tool });
        simulate(panel0.node, 'focus');
        tool.methods = [];
        let cursor = celltools.activeCell.model.getMetadata('foo');
        cursor.setValue(1);
        expect(tool.methods).to.contain('onMetadataChanged');
      });

    });

  });

  describe('CellTools.ActiveCellTool', () => {

    it('should create a new active cell tool', () => {
      let tool = new CellTools.ActiveCellTool({ celltools });
      celltools.addItem({ widget: tool });
      expect(tool).to.be.a(CellTools.ActiveCellTool);
    });

    it('should handle a change to the active cell', () => {
      let tool = new CellTools.ActiveCellTool({ celltools });
      celltools.addItem({ widget: tool });
      simulate(panel0.node, 'focus');
      expect(tool.node.querySelector('.jp-CellEditor')).to.be.ok();
      expect(tool.node.querySelector('.jp-InputArea-editor')).to.be.ok();
    });

  });

  describe('CellTools.MetadataEditor', () => {

    it('should create a new metadata editor tool', () => {
      let tool = new CellTools.MetadataEditor({ celltools });
      expect(tool).to.be.a(CellTools.MetadataEditor);
    });

    it('should handle a change to the active cell', () => {
      let tool = new CellTools.MetadataEditor({ celltools });
      let textarea = tool.textarea;
      expect(textarea.value).to.be('');
      simulate(panel0.node, 'focus');
      expect(textarea.value).to.be.ok();
    });

    it('should handle a change to the metadata', () => {
      let tool = new CellTools.MetadataEditor({ celltools });
      let textarea = tool.textarea;
      simulate(panel0.node, 'focus');
      let previous = textarea.value;
      let cursor = celltools.activeCell.model.getMetadata('foo');
      cursor.setValue(1);
      expect(textarea.value).to.not.be(previous);
    });

  });

  describe('CellTools.KeySelector', () => {

    let tool: LogKeySelector;

    beforeEach(() => {
      tool = new LogKeySelector({
        celltools,
        key: 'foo',
        optionsMap: {
          'bar': 1,
          'baz': [1, 2, 'a']
        }
      });
      celltools.addItem({ widget: tool });
      simulate(panel0.node, 'focus');
      tabpanel.currentIndex = 2;
    });

    afterEach(() => {
      tool.dispose();
    });

    describe('#constructor()', () => {

      it('should create a new key selector', () => {
        expect(tool).to.be.a(CellTools.KeySelector);
      });

    });

    describe('#key', () => {

      it('should be the key used by the selector', () => {
        expect(tool.key).to.be('foo');
      });

    });

    describe('#selectNode', () => {

      it('should be the select node', () => {
        expect(tool.selectNode.localName).to.be('select');
      });

    });

    describe('#handleEvent()', () => {

      context('change', () => {

        it('should update the metadata', () => {
          let select = tool.selectNode;
          simulate(select, 'focus');
          select.selectedIndex = 1;
          simulate(select, 'change');
          expect(tool.events).to.contain('change');
          let cursor = celltools.activeCell.model.getMetadata('foo');
          expect(cursor.getValue()).to.eql([1, 2, 'a']);
        });

      });

      context('focus', () => {

        it('should add the focused class to the wrapper node', () => {
          let select = tool.selectNode;
          simulate(select, 'focus');
          let selector = '.jp-KeySelector-selectWrapper.jp-mod-focused';
          expect(tool.node.querySelector(selector)).to.be.ok();
        });

      });

      context('blur', () => {

        it('should remove the focused class from the wrapper node', () => {
          let select = tool.selectNode;
          simulate(select, 'focus');
          simulate(select, 'blur');
          let selector = '.jp-KeySelector-selectWrapper.jp-mod-focused';
          expect(tool.node.querySelector(selector)).to.not.be.ok();
        });

      });

    });

    describe('#onAfterAttach()', () => {

      it('should add event listeners', () => {
        let select = tool.selectNode;
        expect(tool.methods).to.contain('onAfterAttach');
        simulate(select, 'focus');
        simulate(select, 'blur');
        select.selectedIndex = 0;
        simulate(select, 'change');
        expect(tool.events).to.eql(['focus', 'blur', 'change']);
      });

    });

    describe('#onBeforeDetach()', () => {

      it('should remove event listeners', () => {
        let select = tool.selectNode;
        tool.parent = null;
        expect(tool.methods).to.contain('onBeforeDetach');
        simulate(select, 'focus');
        simulate(select, 'blur');
        simulate(select, 'change');
        expect(tool.events).to.eql([]);
      });

    });

    describe('#onValueChanged()', () => {

      it('should update the metadata', () => {
        let select = tool.selectNode;
        simulate(select, 'focus');
        select.selectedIndex = 1;
        simulate(select, 'change');
        expect(tool.methods).to.contain('onValueChanged');
        let cursor = celltools.activeCell.model.getMetadata('foo');
        expect(cursor.getValue()).to.eql([1, 2, 'a']);
      });

    });

    describe('#onActiveCellChanged()', () => {

      it('should update the select value', () => {
        let cell = panel0.notebook.widgets.at(1);
        let cursor = cell.model.getMetadata('foo');
        cursor.setValue(1);
        panel0.notebook.activeCellIndex = 1;
        expect(tool.methods).to.contain('onActiveCellChanged');
        expect(tool.selectNode.value).to.be('1');
      });

    });

    describe('#onMetadataChanged()', () => {

      it('should update the select value', () => {
        let cursor = celltools.activeCell.model.getMetadata('foo');
        cursor.setValue(1);
        expect(tool.methods).to.contain('onMetadataChanged');
        expect(tool.selectNode.value).to.be('1');
      });

    });

  });

  describe('CellTools.createSlideShowSelector()', () => {

    it('should create a slide show selector', () => {
      let tool = CellTools.createSlideShowSelector({ celltools });
      celltools.addItem({ widget: tool });
      simulate(panel0.node, 'focus');
      tabpanel.currentIndex = 2;
      expect(tool).to.be.a(CellTools.KeySelector);
      expect(tool.key).to.be('slideshow');
      let select = tool.selectNode;
      expect(select.value).to.be('');
      let cursor = celltools.activeCell.model.getMetadata('slideshow');
      expect(cursor.getValue()).to.be(void 0);
      simulate(select, 'focus');
      tool.selectNode.selectedIndex = 1;
      simulate(select, 'change');
      expect(cursor.getValue()).to.be('slide');
    });

  });

  describe('CellTools.createNBConvertSelector()', () => {

    it('should create a raw mimetype selector', () => {
      let tool = CellTools.createNBConvertSelector({ celltools });
      celltools.addItem({ widget: tool });
      simulate(panel0.node, 'focus');
      NotebookActions.changeCellType(panel0.notebook, 'raw');
      tabpanel.currentIndex = 2;
      expect(tool).to.be.a(CellTools.KeySelector);
      expect(tool.key).to.be('raw_mimetype');
      let select = tool.selectNode;
      expect(select.value).to.be('');
      let cursor = celltools.activeCell.model.getMetadata('raw_mimetype');
      expect(cursor.getValue()).to.be(void 0);
      simulate(select, 'focus');
      tool.selectNode.selectedIndex = 2;
      simulate(select, 'change');
      expect(cursor.getValue()).to.be('text/restructuredtext');
    });

    it('should have no effect on a code cell', () => {
      let tool = CellTools.createNBConvertSelector({ celltools });
      celltools.addItem({ widget: tool });
      simulate(panel0.node, 'focus');
      tabpanel.currentIndex = 2;
      expect(tool).to.be.a(CellTools.KeySelector);
      expect(tool.key).to.be('raw_mimetype');
      let select = tool.selectNode;
      expect(select.disabled).to.be(true);
      expect(select.value).to.be('');
      let cursor = celltools.activeCell.model.getMetadata('raw_mimetype');
      expect(cursor.getValue()).to.be(void 0);
      simulate(select, 'focus');
      tool.selectNode.selectedIndex = 2;
      simulate(select, 'change');
      expect(cursor.getValue()).to.be(void 0);
    });

  });

});
