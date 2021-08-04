// Details at https://react-select.com
import * as React from "react";
import { ActionMeta, ValueType } from "react-select";
import Select from "react-select";

// internal type for thinking about items in the combox
export type ComboboxItem = {
    value: any;
    label?: string | JSX.Element;
};

// values for working with the Creatable Select control
enum OnChangeEnum {
    selectOption = "select-option",
    deselectOption = "deselect-option",
    removeValue = "remove-value",
    popValue = "pop-value",
    setValue = "set-value",
    clear = "clear",
    createOption = "create-option"
}

// Input bindings for the combobox
type ComboboxProps = {
    itemsSource: ComboboxItem[];
    selectedItem: any;
    onSelectValue: (selectedItem: any) => void;
    placeholder?: string;
    menuWidth?: string;
    width?: string;
    styleOverride?: any;
};

export const SelectedItemComponent = (props:any) => {
    return (<div style={{ marginTop: "0px", height: "100%", marginLeft: "3px" }}>
        {props.data.label ?? props.data.value}
    </div>)
};


// -------------------------------------------------------------------
//  Here is the actual combobox component
// -------------------------------------------------------------------
export default function Combobox(props: ComboboxProps) {
    const {
        itemsSource,
        selectedItem,
        onSelectValue,
    } = props;

    // Setting up automatic state for items we don't expect to bind
    // to external data.
    const [open, setOpen] = React.useState(false);

    const show = () => { console.log("OPEN"); setOpen(true); };
    const hide = () => { console.log("HIDE"); setOpen(false); };

    // Process changes to the CreatableSelect control and communicate
    // those out as necessary.  
    const handleChange = (
        newValue: ValueType<ComboboxItem, false>,
        actionMeta: ActionMeta<ComboboxItem>
    ) => {
        switch (actionMeta.action) {
            case OnChangeEnum.selectOption:
                onSelectValue(newValue.value)
                hide(); // manually hiding the combobox as we control it by ourself
                break;
            case OnChangeEnum.clear:
                onSelectValue(null);
                break;
        }
    };

    const customStyles = {
        control: (styles: any) => ({ 
             ...styles, 
             ...props.styleOverride,
             minHeight: '16px',
             margin: '1px',
             width: props.width ?? '100%',
    
        }),
        indicatorsContainer: (styles: any) => ({
            ...styles, 
            ...props.styleOverride,
            //height:'10px',
            padding: '0px',
        }),
        valueContainer: (styles: any) => ({
             ...styles, 
             ...props.styleOverride,
             //padding:'0px',
            // height: '16px',
        }),
        menu: (styles: any) => ({
            ...styles, 
            ...props.styleOverride,
            width: null,
        }),
        menuList: (styles: any) => ({
            ...styles, 
            ...props.styleOverride,
            width: null,
        }),
        menuPortal: (styles: any) => ({
            ...styles, 
            ...props.styleOverride,
            zIndex:50,
        }),
        option: (styles: any, { data, isDisabled, isFocused, isSelected }: any) => {
           return {
             ...styles,
             ...props.styleOverride,
             padding: "2px",
             width: props.width ?? props.menuWidth ?? "100%",
           };
         },
      };
        

    // -------------------------------------------------------------------
    // Visuals and bindings for the combobox control
    // -------------------------------------------------------------------
    return ( <Select<ComboboxItem>
        autoFocus={true}
        menuIsOpen={open}
        onMenuOpen={show}
        value={itemsSource.find(i => i.value === selectedItem) ?? {value: null, label:props.placeholder ?? "---" } }
        onBlur={hide}
        options={itemsSource}
        onChange={handleChange}
        //formatOptionLabel={(v) => <div>zzz {v.value}</div>}
        components={{ SingleValue: SelectedItemComponent, DropdownIndicator: null }}
        styles={customStyles}
        menuPortalTarget={document.body}
        isSearchable={false}
        />
    );
}

