import { observer } from "mobx-react";
import { WidgetContainer } from "models/WidgetContainer";
import './WidgetRichText.module.css';
import styles from './WidgetRichText.module.css';
import { WidgetModelData } from "models/WidgetModel"; 
import { registerWidget, WidgetType } from "widgetLibrary";
import WidgetBase from "./WidgetBase";
import { BubbleMenu, ChainedCommands, Editor, EditorContent, posToDOMRect } from '@tiptap/react'
import BulletList from "@tiptap/extension-bullet-list"
import HardBreak from "@tiptap/extension-hard-break"
import HorizontalRule from "@tiptap/extension-horizontal-rule"
import ListItem from "@tiptap/extension-list-item"
import OrderedList from "@tiptap/extension-ordered-list"
import Heading from "@tiptap/extension-heading"
import Text from '@tiptap/extension-text'
import Code from '@tiptap/extension-code'
import Link from '@tiptap/extension-link'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import History from '@tiptap/extension-history'
//import { makeObservable, observable } from "mobx";

export class WidgetRichTextData extends WidgetModelData
{
    __t = "WidgetRichTextData" // Help the serializer know the type when code is minimized
    //@observable  --- should NOT be observable because it moves the cursor to the end
    private _body =  'Enter formatted text here...';
    get body() {return this._body}
    set body(value: string) { this.updateMe(()=>{this._body = value})} 

    // constructor() {
    //     super();
    //     makeObservable(this);
    // }
}

@observer
export default class WidgetRichText 
extends WidgetBase<{context: WidgetContainer, scale: number},{editor: any}> 
{    
    editor?: Editor;
    lastMouseX = 0;
    lastMouseY = 0;

    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        registerWidget(WidgetType.RichText, (c,s) => <WidgetRichText context={c} scale={s} />, "WidgetRichTextData", () => new WidgetRichTextData())
    }

    // -------------------------------------------------------------------
    // renderContent
    //      Text rendering with TipTap, which is fast, free, awesome and 
    //      incredibly extensibe!   See: https://tiptap.dev/introduction/
    // -------------------------------------------------------------------
    renderContent() {
        const {context} = this.props;
        const widget = context.ref_widget;
        const data = widget.data as WidgetRichTextData
        const editorColor= context.colorTheme.color(context.foregroundColorIndex, context.foregroundColorValue);

        // helper to change the a hyperlink reference value
        const setLink = () => {
            const previousUrl = this.editor.getAttributes('link').href
            const url = window.prompt('URL', previousUrl)
            if (url === null) { return } // Cancelled
        
            const range = this.editor.chain().focus().extendMarkRange('link')
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

        if(!this.editor) {
            this.editor = new Editor({
                extensions: [
                    BulletList,
                    HardBreak,
                    HorizontalRule,
                    ListItem,
                    OrderedList,
                    Document,
                    Paragraph,
                    Bold,
                    Italic,
                    CustomText,
                    Code,
                    Heading,
                    History,
                    Link.configure({
                        openOnClick: true,
                    })
                ],
                onUpdate: (props) => {
                    data.body = props.editor.getHTML()
                }
            })     
        }
        this.editor.commands.setContent(data.body, false, {preserveWhitespace: "full"});


        const styleButton = (
                label: string, 
                isActive: boolean, 
                onClick: (focus: ChainedCommands) => boolean
        ) =>  <button
                onClick={() => onClick(this.editor.chain().focus())}
                className={isActive ? 'is-active' : ''}
            >
                {label}
            </button>

        const check = (n: string, a?: {}) => this.editor.isActive(n,a)
        const focusAtEnd = ()=>  this.editor.commands.focus('end', {scrollIntoView: true}) 
        
        console.log("HELP")
        const getReferenceClientRect = () => {
            const selection = window.getSelection();
            if(selection) {
                const range = selection.getRangeAt(0); //get the text range
                const selectedRect = range.getBoundingClientRect();
                const container = document.getElementById(`container_${context.widgetId}`)
                const containerRect = container.getBoundingClientRect();
                const x = containerRect.x / this.props.scale;
                const y = selectedRect.y / this.props.scale;
                const width = containerRect.width / this.props.scale
                const height = 50 / this.props.scale
                const returnMe = new DOMRect( x,y,width, height )

                return returnMe;
    
            } else {
                console.log(`HERE???`)
              return posToDOMRect(this.editor!.view,0,0)
            }
        };

        return <div 
                className={`${styles.widgetEditor}`}
                style={{color: editorColor}}
                id={`container_${context.widgetId}`}>
            {this.editor && <BubbleMenu className="bubble-menu" tippyOptions={{ duration: 100, getReferenceClientRect }} editor={this.editor}>
                {styleButton("Bold", check("bold"), (f) => f.toggleBold().run())}
                {styleButton("Italic", check("bold"), (f) => f.toggleItalic().run())}
                |
                {styleButton("Link", check("link"), (f) => setLink())}

                {styleButton("H1", check('heading', { level: 1 }), (f) => f.toggleHeading({ level: 1 }).run())}
                {styleButton("H2", check('heading', { level: 2 }), (f) => f.toggleHeading({ level: 2 }).run())}
                {styleButton("Bullets", check('bulletList'), (f) => f.toggleBulletList().run())}
            </BubbleMenu>}

            <EditorContent editor={this.editor} spellCheck="false" onMouseDown={(e) => {this.lastMouseX = e.clientX; this.lastMouseY = e.clientY}}/>
            <div style={{height:"100%"}} onClick={focusAtEnd} />
        </div>
    };

    renderConfigUI = () => <div></div>
}
