import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData } from "models/WidgetModel";
import appStyles from '../AppStyles.module.css';
import { CgCloseR } from "react-icons/cg";
import Row from "Components/Row";
import Combobox from "Components/ComboBox";
import { registerWidget, WidgetType } from "widgetLibrary";
import WidgetBase from "./WidgetBase";


interface SearchConfig
{
    name: string
    createSubmitUrl: (searchText: string) => string
}

const searches:SearchConfig[] = [
    {   name: "Google", 
        createSubmitUrl: (searchText: string) => `https://www.google.com/search?hl=en&q=${searchText}`
    },
    {   name: "Amazon", 
        createSubmitUrl: (searchText: string) => `https://www.amazon.com/s?k=${searchText}`
    },
    {   name: "Thesaurus", 
        createSubmitUrl: (searchText: string) => `https://www.thesaurus.com/browse/${searchText}`
    },
    {   name: "Rhymes", 
        createSubmitUrl: (searchText: string) => `https://rhymezone.com/r/rhyme.cgi?Word=${searchText}&typeofrhyme=perfect`
    },
    {
        name: "custom",
        createSubmitUrl: (searchText: string) => ""
    }
    

]

export class WidgetSearchData extends WidgetModelData
{
    @observable private _searchType: string = searches[0].name
    get searchType() {return this._searchType}
    set searchType(value:string) { 
        if(value !== this._searchType) this.updateMe(()=>{this._searchType = value})
    }

    @observable private _customName: string 
    get customName() {return this._customName}
    set customName(value:string) {
        if(value !== this._customName) this.updateMe(()=>{this._customName = value})
    }

    @observable private _customTemplate: string 
    get customTemplate() {return this._customTemplate}
    set customTemplate(value:string) {
        if(value !== this._customTemplate) this.updateMe(()=>{this._customTemplate = value})
    }

    constructor() {
        super();
        makeObservable(this);
    }


}

@observer
export default class WidgetSearch
extends WidgetBase<{context: WidgetContainer}, {searchText: string, choosing: boolean, editingTemplate: boolean}> 
{    
    state = {searchText: "", choosing: false, editingTemplate: false} 

    // -------------------------------------------------------------------
    // register
    // -------------------------------------------------------------------
    static register() {
        registerWidget(WidgetType.Search, c => <WidgetSearch context={c} />, "WidgetSearchData", () => new WidgetSearchData())
    }

    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    renderContent() {
        const {context} = this.props;
        const data = this.props.context.ref_widget.data as WidgetSearchData; 
        const searchConfig = searches.find(s => s.name === data.searchType) ?? searches[0]

        const pixelWidth = context.w * context.parentPage.columnWidth;

        const labelStyle = {
            fontSize: "10px",
            background: context.colorTheme.color(ColorIndex.Special,ColorValue.V7_ExtraBright),
            color: context.colorTheme.color(ColorIndex.Highlight,ColorValue.V2_Dark),
        }
        const configStyle:any = {
            background: context.colorTheme.color(context.backGroundColorIndex, context.backGroundColorValue),
            color: context.colorTheme.color(context.foregroundColorIndex, context.foregroundColorValue),
            width: '400px',
            fontSize: '10px',
        }

        const enableChoosing = () => this.setState({choosing: true})
        const disableChoosing = () => this.setState({choosing: false})        
        const handleTypeSelect = (controlType:string) =>
        {
            disableChoosing();
            data.searchType = controlType;  
            if(controlType === "custom"){
                this.setState({editingTemplate: true})
                if(!data.customName) data.customName = "exampleName"
                if(!data.customTemplate) data.customTemplate = "https://www.google.com/search?q=##SEARCHTEXT##" 
            }          
        }

        const doneEditingTemplate= () => 
        {
            this.setState({editingTemplate: false})
            if(!data.customName || data.customName === "") data.customName = "???"
        }

        const comboBoxSource = searches.map(s=>({value: s.name, label: <div style={labelStyle}>{s.name}</div>}))
        const navigateOnEnter = (e:any) => {
            if(e.key === "Enter"){
                if(data.searchType === "custom") {
                    const target = data.customTemplate.replace(/##SEARCHTEXT##/ig, this.state.searchText)
                    window.location.href = target;
                }
                else {
                    window.location.href = searchConfig.createSubmitUrl(this.state.searchText)
                }
            }            
        }

        return (
            <Row style={{fontSize: '10px', padding:'5px', paddingLeft: '3px', paddingTop: "6px", paddingRight: '0px'}}> 
                
                {
                    this.state.editingTemplate
                        ? <div className={`${appStyles.widgetConfig}`} style={configStyle} onMouseDown={(e) => e.stopPropagation()}>
                            <div 
                                className={appStyles.closeButton} 
                                style={{right: "3px", top:"3px"}}
                                onClick={()=> this.setState({editingTemplate: false})}>
                                    <CgCloseR />
                            </div>
                            <div style={{margin:"10px"}}>
                                <Row style={{marginBottom: '5px'}}>
                                    <div style={{width:'60px'}}>Name:</div> 
                                    <input  type="text" 
                                        style={{fontSize: '10px'}}
                                        className={appStyles.searchInput}
                                        value={ data.customName}
                                        onChange={(e) =>  data.customName = e.target.value }  /> 
                                </Row>
                                <Row style={{marginBottom: '5px'}}>
                                    <div style={{width:'60px'}}>Template:</div> 
                                    <input  type="text" 
                                        style={{width:'300px',fontSize: '10px'}}
                                        className={appStyles.searchInput}
                                        value={ data.customTemplate }
                                        onChange={(e) =>  data.customTemplate = e.target.value }  /> 
                                </Row>
                                <button onClick={doneEditingTemplate}>Done</button>
                            </div>
                        </div>
                        : null
                }
                <div style={{position: "relative"}}>
                    {this.state.searchText 
                        ? null
                        : <div 
                            className={appStyles.searchTypeIndicator}
                            onClick={enableChoosing}
                            >{searchConfig.name === "custom" ? data.customName : searchConfig.name}</div>
                    }
                    {this.state.choosing
                        ? <div className={appStyles.searchTypePicker}>
                            <Combobox 
                                startOpened={true}
                                onBlur={disableChoosing}    
                                itemsSource={comboBoxSource}
                                selectedItem={data.searchType ?? "exampleName"}
                                onSelectValue={handleTypeSelect} 
                                placeholder="Search Type"
                                width='70px'
                                styleOverride={labelStyle}
                                        
                            /></div>
                        : null
                    }                    
                    <input  type="text" 
                            className={appStyles.searchInput}
                            value={ this.state.searchText }
                            style={{width: `${pixelWidth - 22}px`}}
                            onClick={disableChoosing}
                            onKeyUp={navigateOnEnter}
                            onChange={(e) =>  this.setState({searchText: e.target.value}) }  />      

                </div>
                           
            </Row>
            
        );
    }; 

    renderConfigUI = () => <div></div>
}

