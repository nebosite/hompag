import { observer } from "mobx-react";
import { WidgetContainer } from "models/WidgetContainer";
import './WidgetRichTextTT.module.css';
import styles from './WidgetRichTextTT.module.css';
import { WidgetModelData } from "models/WidgetModel"; 
import { registerWidget, WidgetType } from "widgetLibrary";
import WidgetBase from "./WidgetBase";
import { BubbleMenu, ChainedCommands, Editor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Text from '@tiptap/extension-text'
import Code from '@tiptap/extension-code'
import Link from '@tiptap/extension-link'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'

export class WidgetRichTextTTData extends WidgetModelData
{
    __t = "WidgetRichTextTTData" // Help the serializer know the type when code is minimized
    // Body should not be observable because it is only used for writing.  
    // THe body state is kept by the editor itself
    private _body: string;
    get body() {return this._body}
    set body(value: string) { this.updateMe(()=>{this._body = value})} 

    // Nothing is observable, so this is not needed
    // constructor() {
    //     super();
    //     makeObservable(this);
    // }
}

@observer
export default class WidgetRichTextTT 
extends WidgetBase<{context: WidgetContainer},{editor: any}> 
{    
    resizeOberver: ResizeObserver

    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        registerWidget(WidgetType.RichTextTT, c => <WidgetRichTextTT context={c} />, "WidgetRichTextTTData", () => new WidgetRichTextTTData())
    }

    // -------------------------------------------------------------------
    // renderContent
    //      Text rendering with TipTap, which is fast, free, awesome and 
    //      incredibly extensibe!   See: https://tiptap.dev/introduction/
    // -------------------------------------------------------------------
    renderContent() {
        const {context} = this.props;
        const widget = context.ref_widget;
        const data = widget.data as WidgetRichTextTTData
        const editorColor= context.colorTheme.color(context.foregroundColorIndex, context.foregroundColorValue);
        let editor: Editor = null;

        // helper to change the a hyperlink reference value
        const setLink = () => {
            const previousUrl = editor.getAttributes('link').href
            const url = window.prompt('URL', previousUrl)
            if (url === null) { return } // Cancelled
        
            const range = editor.chain().focus().extendMarkRange('link')
            if (url === '') {  return range.unsetLink().run() }
            else return range.setLink({ href: url, target: '_self' }).run()   
        }

        // Add some keyboard shortcuts
        const CustomText = Text.extend({
            addKeyboardShortcuts() {
                return {
                    'Control-k': () => setLink()
                }
            }
        })

        editor = new Editor({
            extensions: [
                StarterKit,
                Document,
                Paragraph,
                CustomText,
                Code,
                Link.configure({
                    openOnClick: true,
                })
            ],
            content:  data.body ?? 'Enter formatted text here...',
            onUpdate: (props) => data.body = props.editor.getHTML()
        })


        const styleButton = (
                label: string, 
                isActive: boolean, 
                onClick: (focus: ChainedCommands) => boolean
        ) =>  <button
                onClick={() => onClick(editor.chain().focus())}
                className={isActive ? 'is-active' : ''}
            >
                {label}
            </button>

        const check = (n: string, a?: {}) => editor.isActive(n,a)
        const focusAtEnd = ()=>  editor.commands.focus('end', {scrollIntoView: true}) 
        
        return <div 
                className={`${styles.widgetEditor}`}
                style={{color: editorColor}}
                id={`container_${context.widgetId}`}>
            {editor && <BubbleMenu className="bubble-menu" tippyOptions={{ duration: 100 }} editor={editor}>
                {styleButton("Bold", check("bold"), (f) => f.toggleBold().run())}
                {styleButton("Italic", check("bold"), (f) => f.toggleItalic().run())}
                |
                {styleButton("Link", check("link"), (f) => setLink())}

                {styleButton("H1", check('heading', { level: 1 }), (f) => f.toggleHeading({ level: 1 }).run())}
                {styleButton("H2", check('heading', { level: 2 }), (f) => f.toggleHeading({ level: 2 }).run())}
                {styleButton("Bullets", check('bulletList'), (f) => f.toggleBulletList().run())}
            </BubbleMenu>}

            <EditorContent editor={editor} />
            <div style={{height:"100%"}} onClick={focusAtEnd} />
        </div>
    };

    renderConfigUI = () => <div></div>
}
