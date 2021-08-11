import { observer } from "mobx-react";
import React from "react";
import 'draft-js/dist/Draft.css';
import { registerDataTypeForWidgetType, WidgetContainer } from "models/WidgetContainer";
import './WidgetEditor.module.css';
import styles from './WidgetEditor.module.css';
import { Editor } from '@tinymce/tinymce-react';
import { registerType } from "models/hompagTypeHelper";
import { WidgetModelData, WidgetType } from "models/WidgetModel"; 

export class WidgetRichTextData extends WidgetModelData
{
    // Body should not be observable because it is only used for writing.  
    // THe body state is kept by the editor itself
    private _body: string;
    get body() {return this._body}
    set body(value: string) {this._body = value; this.save()} 

    // Nothing is observable, so this is not needed
    // constructor() {
    //     super();
    //     makeObservable(this);
    // }
}

registerDataTypeForWidgetType(WidgetType.Editor, "WidgetRichTextData");
registerDataTypeForWidgetType(WidgetType.RichText, "WidgetRichTextData");
registerType("WidgetRichTextData", () => new WidgetRichTextData())
registerType("WidgetEditorData", () => new WidgetRichTextData())

@observer
export default class WidgetRichText 
extends React.Component<{context: WidgetContainer},{editor: any}> 
{    
    resizeOberver: ResizeObserver

    // -------------------------------------------------------------------
    // componentDidMount - set up resize listener
    // -------------------------------------------------------------------
    componentDidMount() {
        const {context} = this.props;

        const containerDiv = window.document.getElementById(`container_${context.widgetId}`)
        const editorElement = containerDiv.lastChild as HTMLElement;
        this.resizeOberver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if(entry.contentRect) {
                    const h = entry.contentRect.height
                    editorElement.style.height = `${h+18}px`;
                } 
                
                // Browser compat?  Not sure what to do if there is no rect.  The code below doesn't
                // work because we only get one contentBoxSize item
                // else {
                //     const w = entry.contentBoxSize[0];
                //     const h = entry.contentBoxSize[1].inlineSize
                //     enditorElement.style.width = w.toString();
                //     enditorElement.style.height = h.toString();
                // }
            }
        })
        this.resizeOberver.observe(containerDiv); 
    }

    // -------------------------------------------------------------------
    // render
    //      https://www.tiny.cloud/docs/plugins/opensource/
    //      https://www.tiny.cloud/docs/advanced/available-toolbar-buttons/
    //      
    // -------------------------------------------------------------------
    render() {
        const {context} = this.props;
        const widget = context.ref_widget;
        const data = widget.data as WidgetRichTextData
        //const color = context.colorTheme.color;
        const editorBackground= context.colorTheme.color(context.backGroundColorIndex, context.backGroundColorValue);
        const editorColor= context.colorTheme.color(context.foregroundColorIndex, context.foregroundColorValue);

        const height = context.h * context.parentPage.rowHeight;

        
        const handleEditorChange = (event: any) => {
            data.body = this.state.editor.contentDocument.body.innerHTML
            // console.log(`The htm}l is: ${context.ref_data.body}`)
        }

        if(this.state?.editor) {
            this.state.editor.getBody().style.backgroundColor = editorBackground;
            this.state.editor.getBody().style.color = editorColor;
        }

        return (
            <div className={`${styles.widgetEditor}`} id={`container_${context.widgetId}`}>
                <Editor
                    onInit={(evt, editor) => {
                        this.setState({editor}) 
                        editor.getBody().style.backgroundColor = editorBackground;
                        editor.getBody().style.color = editorColor;
                        editor.getBody().style.border = undefined;
                        

                        // On click, navigate to links
                        editor.on("click", function (e){
                            var sel = editor.selection.getSel();
                            var element = sel?.focusNode.parentElement as HTMLAnchorElement;
                            if(element && element.tagName === "A")
                            {
                                const mouseIsInsideLink = element.matches(":hover");
                                const url = element.href;
                                const range = sel.getRangeAt(0);
                                const isSelection = (range.endOffset - range.startOffset) > 0;
                                if(!isSelection && mouseIsInsideLink)
                                {
                                    //console.log(`--------------------> Link to : ${range.endOffset} of ${sel.anchorNode.textContent.length} ${url}`)
                                    window.location.href = url;
                                }

                            }
                        })

                        editor.on('KeyDown', function(e){
                            // Tab should indent
                            if(e.keyCode === 9 && !e.altKey && !e.ctrlKey)
                            {
                                editor.execCommand(e.shiftKey ? "Outdent" : "Indent")
                                e.preventDefault();
                            }
                        });
                        
                        editor.on('KeyUp', function(e){
                            var sel = editor.selection.getSel();
                            var caretPos = sel.anchorOffset;
                            var txtData = sel.anchorNode.textContent;
                            
                            // if the user types '* ' or '- ' then convert to a bullet
                            // Note that the character from &nbsp; is different that an ascii space.  That's
                            // why the match has two spaces in the 2nd character place.  They are actually 
                            // different character codes. 
                            if(e.key === ' ' && caretPos === 2 && (txtData.match(/^[*-][  ]/)))
                            {
                                if(sel.focusNode.parentElement.constructor.name === "HTMLParagraphElement")
                                {
                                    sel.focusNode.parentElement.outerHTML = `<ul><li>${txtData.substr(2)}</li></ul>`
                                }
                            }                        
                        });
                    }}
                    initialValue={data?.body ?? `<p>A shiny new text area</p>`}
                    apiKey="i9mbmtxj437lrd1i9a3vsf1e3cg88gbxmkzbcncacfwbj0l0"
                    onChange={handleEditorChange}
                    init={{
                        height: height,
                        menubar: false,
                        skin: 'borderless',
                        icons: 'small',
                        indentation: "10px",
                        toolbar: false,//'bold italic color | outdent indent | bullist numlist | code',
                        contextmenu: "bold italic link lists | code",
                        toolbar_location: 'bottom',
                        plugins: [
                            'advlist autolink lists link image charmap print preview anchor',
                            'searchreplace visualblocks code',
                            'insertdatetime media table paste code'
                        ],
                        content_css: './editor.css',
                    }}
                />
            </div> 
        );
    };
}
