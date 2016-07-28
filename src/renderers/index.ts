// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/addon/runmode/runmode';

import * as marked
  from 'marked';

import {
  ansi_to_html, escape_for_html
} from 'ansi_up';

import {
  Widget
} from 'phosphor-widget';

import {
  Message
} from 'phosphor-messaging';

import {
  requireMode
} from '../codemirror';

import {
  RenderMime
} from '../rendermime';

import {
  typeset, removeMath, replaceMath
} from './latex';


/**
 * The class name added to rendered widgets.
 */
const RENDERED_CLASS = 'jp-Rendered';

/**
 * The class name added to rendered html widgets.
 */
const RENDERED_HTML = 'jp-Rendered-html';


// Support GitHub flavored Markdown, leave sanitizing to external library.
marked.setOptions({
  gfm: true,
  sanitize: false,
  breaks: true,
  langPrefix: 'cm-s-default language-',
  highlight: (code, lang, callback) => {
    if (!lang) {
        // no language, no highlight
        if (callback) {
            callback(null, code);
            return;
        } else {
            return code;
        }
    }
    requireMode(lang).then(spec => {
      let el = document.createElement('div');
      if (!spec) {
          console.log(`No CodeMirror mode: ${lang}`);
          callback(null, code);
          return;
      }
      try {
        CodeMirror.runMode(code, spec, el);
        callback(null, el.innerHTML);
      } catch (err) {
        console.log(`Failed to highlight ${lang} code`, err);
        callback(err, code);
      }
    }).catch(err => {
      console.log(`No CodeMirror mode: ${lang}`);
      console.log(`Require CodeMirror mode error: ${err}`);
      callback(null, code);
    });
  }
});


/**
 * A widget for displaying HTML and rendering math.
 */
class HTMLWidget extends Widget {
  /**
   * Construct a new html widget.
   */
  constructor(html: string) {
    super();
    this.addClass(RENDERED_HTML);
    this.addClass(RENDERED_CLASS);
    try {
      let range = document.createRange();
      this.node.appendChild(range.createContextualFragment(html));
    } catch (error) {
      console.warn('Environment does not support Range ' +
                   'createContextualFragment, falling back on innerHTML');
      this.node.innerHTML = html;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    typeset(this.node);
  }
}


/**
 * A widget for displaying LaTeX output.
 */
class LatexWidget extends Widget {
  /**
   * Construct a new latex widget.
   */
  constructor(text: string) {
    super();
    this.node.textContent = text;
    this.addClass(RENDERED_CLASS);
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  onAfterAttach(msg: Message): void {
    typeset(this.node);
  }
}


/**
 * A renderer for raw html.
 */
export
class HTMLRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['text/html'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  sanitizable(mimetype: string): boolean {
    return true;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRenderOptions): Widget {
    let source = options.source;
    if (options.sanitizer) {
      source = options.sanitizer.sanitize(source);
    }
    let w = new HTMLWidget(source);
    resolveUrls(w.node, options.resolver);
    return w;
  }
}


/**
 * A renderer for `<img>` data.
 */
export
class ImageRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['image/png', 'image/jpeg', 'image/gif'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  sanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return true;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRenderOptions): Widget {
    let w = new Widget();
    let img = document.createElement('img');
    img.src = `data:${options.mimetype};base64,${options.source}`;
    w.node.appendChild(img);
    w.addClass(RENDERED_CLASS);
    return w;
  }
}


/**
 * A renderer for plain text and Jupyter console text data.
 */
export
class TextRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['text/plain', 'application/vnd.jupyter.console-text'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  sanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return true;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRenderOptions): Widget {
    let w = new Widget();
    let data = escape_for_html(options.source);
    w.node.innerHTML = `<pre>${ansi_to_html(data)}</pre>`;
    w.addClass(RENDERED_CLASS);
    return w;
  }
}


/**
 * A renderer for raw `<script>` data.
 */
export
class JavascriptRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['text/javascript', 'application/javascript'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  sanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRenderOptions): Widget {
    let w = new Widget();
    let s = document.createElement('script');
    s.type = options.mimetype;
    s.textContent = options.source;
    w.node.appendChild(s);
    w.addClass(RENDERED_CLASS);
    return w;
  }
}


/**
 * A renderer for `<svg>` data.
 */
export
class SVGRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['image/svg+xml'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  sanitizable(mimetype: string): boolean {
    return true;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRenderOptions): Widget {
    let source = options.source;
    if (options.sanitizer) {
      source = options.sanitizer.sanitize(source);
    }
    let w = new Widget();
    w.node.innerHTML = source;
    let svgElement = w.node.getElementsByTagName('svg')[0];
    if (!svgElement) {
      throw new Error('SVGRender: Error: Failed to create <svg> element');
    }
    resolveUrls(w.node, options.resolver);
    w.addClass(RENDERED_CLASS);
    return w;
  }
}


/**
 * A renderer for PDF data.
 */
export
class PDFRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['application/pdf'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  sanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Render the transformed mime bundle.
   */
  render(options: RenderMime.IRenderOptions): Widget {
    let w = new Widget();
    let a = document.createElement('a');
    a.target = '_blank';
    a.textContent = 'View PDF';
    a.href = 'data:application/pdf;base64,' + options.source;
    w.node.appendChild(a);
    w.addClass(RENDERED_CLASS);
    return w;
  }
}


/**
 * A renderer for LateX data.
 */
export
class LatexRenderer implements RenderMime.IRenderer  {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['text/latex'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  sanitizable(mimetype: string): boolean {
    return false;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return true;
  }

  /**
   * Render the mime bundle.
   */
  render(options: RenderMime.IRenderOptions): Widget {
    return new LatexWidget(options.source);
  }
}


/**
 * A renderer for Jupyter Markdown data.
 */
export
class MarkdownRenderer implements RenderMime.IRenderer {
  /**
   * The mimetypes this renderer accepts.
   */
  mimetypes = ['text/markdown'];

  /**
   * Whether the input can safely sanitized for a given mimetype.
   */
  sanitizable(mimetype: string): boolean {
    return true;
  }

  /**
   * Whether the input is safe without sanitization.
   */
  isSafe(mimetype: string): boolean {
    return false;
  }

  /**
   * Render the mime bundle.
   */
  render(options: RenderMime.IRenderOptions): Promise<Widget> {
    let parts = removeMath(options.source);
    let renderer = new marked.Renderer();
    renderer.link = (href: string, title: string, text: string) => {
      href = options.resolver.resolveUrl(href);
      let out = '<a href="' + href + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out += '>' + text + '</a>';
      return out;
    };
    renderer.image = (href: string, title: string, text: string) => {
      href = options.resolver.resolveUrl(href);
      let out = '<img src="' + href + '" alt="' + text + '"';
      if (title) {
        out += ' title="' + title + '"';
      }
      out += '>';
      return out;
    };
    let dummy = document.createElement('div');
    // Catch-all.
    renderer.paragraph = (text: string) => {
      text = '<p>' + text + '</p>\n';
      if (options.sanitizer) {
        text = options.sanitizer.sanitize(text);
      }
      dummy.innerHTML = text;
      resolveUrls(dummy, options.resolver);
      return dummy.innerHTML;
    };
    return new Promise<Widget>((resolve, reject) => {
      marked(parts['text'], { renderer }, (err, content) => {
        if (err) {
          reject(err);
        }
        content = replaceMath(content, parts['math']);
        if (options.sanitizer) {
          content = options.sanitizer.sanitize(content);
        }
        resolve(new HTMLWidget(content));
      });
    });
  }
}


/**
 * Resolve the relative urls in the image and anchor tags of a node tree.
 *
 * @param node - The head html element.
 *
 * @param resolver - A url resolver.
 */
export
function resolveUrls(node: HTMLElement, resolver: RenderMime.IResolver): void {
  let imgs = node.getElementsByTagName('img');
  for (let i = 0; i < imgs.length; i++) {
    let img = imgs[i];
    let source = img.getAttribute('src');
    if (source) {
      img.src = resolver.resolveUrl(source);
    }
  }
  let anchors = node.getElementsByTagName('a');
  for (let i = 0; i < anchors.length; i++) {
    let anchor = anchors[i];
    let href = anchor.getAttribute('href');
    if (href) {
      anchor.href = resolver.resolveUrl(href);
    }
  }
}
