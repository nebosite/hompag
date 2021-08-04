import { ColorIndex, ColorValue } from "helpers/ColorTool";
import { makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { registerType } from "models/hompagTypeHelper";
import { registerDataTypeForWidgetType, WidgetContainer } from "models/WidgetContainer";
import { WidgetModelData, WidgetType } from "models/WidgetModel";
import React from "react";
import Combobox from "./ComboBox";
import Row from "./Row";

interface SearchConfig
{
    name: string
    createSubmitUrl: (searchText: string) => string
}

const searches:SearchConfig[] = [
    {   name: "Google", 
    createSubmitUrl: (searchText: string) => `https://www.google.com/search?hl=en&q=${searchText}`
    },
    {   name: "Google2", 
    createSubmitUrl: (searchText: string) => `https://www.google.com/search?hl=en&q=${searchText}`
    },
    {   name: "Thesaurus", 
        createSubmitUrl: (searchText: string) => `https://www.thesaurus.com/browse/${searchText}`
    },
    {   name: "Rhymes", 
        createSubmitUrl: (searchText: string) => `https://rhymezone.com/r/rhyme.cgi?Word=${searchText}&typeofrhyme=perfect`
    },

]

export class WidgetSearchData extends WidgetModelData
{
    @observable private _searchType: string = searches[0].name
    get searchType() {return this._searchType}
    set searchType(value:string) {
        console.log(`Setting search type to : ${value} ${this._searchType}`)
        if(value === this._searchType) return;
        console.log(`Setting search type to : ${value}`)
        this._searchType = value;
        this.save();
    }

    constructor() {
        super();
        makeObservable(this);
    }
}

registerDataTypeForWidgetType(WidgetType.Search, "WidgetSearchData");
registerType("WidgetSearchData", () => new WidgetSearchData())


@observer
export default class WidgetSearch
extends React.Component<{context: WidgetContainer}, {searchText: string}> 
{    
    state = {searchText: ""} 
    // -------------------------------------------------------------------
    // render
    // -------------------------------------------------------------------
    render() {
        const {context} = this.props;
        const data = this.props.context.ref_widget.data as WidgetSearchData; 
        const searchConfig = searches.find(s => s.name === data.searchType)

        const pixelWidth = context.w * context.parentPage.columnWidth;

        const labelStyle = {
            fontSize: "10px",
            background: context.colorTheme.color(ColorIndex.Special,ColorValue.V7_ExtraBright),
            color: context.colorTheme.color(ColorIndex.Highlight,ColorValue.V2_Dark),
        }

        return (
            <Row style={{fontSize: '10px', padding:'5px'}}> 
                <Combobox 
                    itemsSource={searches.map(s=>({value: s.name, label: <div style={labelStyle}>{s.name}</div>}))}
                    selectedItem={data.searchType}
                    onSelectValue={v=> {data.searchType = v}} 
                    placeholder="Search Type"
                    width='60px'
                    styleOverride={labelStyle}
                            
                />
                <input  type="text" 
                        value={ this.state.searchText }
                        style={{width: `${pixelWidth - 98}px`}}
                        onKeyUp={e => {
                            if(e.key === "Enter"){
                                window.location.href = searchConfig.createSubmitUrl(this.state.searchText)
                            }
                        }}
                        onChange={(e) =>  this.setState({searchText: e.target.value}) }  />      
                           
            </Row>
            
        );
    }; 
}
