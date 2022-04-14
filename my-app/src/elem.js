import './App.css';

import * as React from 'react';
import {
    CircularProgress, TableCell, Box, Paper, InputBase,
    Switch, Typography, TextField, FormControl, InputLabel, Select, MenuItem
} from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import SportsBaseballSharpIcon from '@material-ui/icons/SportsBaseballSharp';
import { FindReplace } from '@material-ui/icons';


export function Spacer(props) {
    return <div style={{ width: props.width || 5, height: props.height || 5 }} />
}
export function Header(props) {
    return <div style={{ fontSize: 35, padding: 10 }}>{props.children}</div>
}

export function Paper1(props) {
    return <Paper elevation={3} style={{ display: 'flex', width: props.width ? props.width : '27%', height: props.height || '85vh', ...props.style }} {...props}>{props.children}</Paper>
}


export function Toolbar(props) {
    return <div style={{ flex: 1, flexDirection: 'row', height: 30, alignItems: 'flex-start' }}>{props.children}</div>
}

export function MyTableCell(props) {
    return <TableCell style={{ fontSize: 25, padding: 0, width: props.width }} align="right">{props.children}</TableCell>
}

export function SmallTableCell(props) {
    return <TableCell style={{ fontSize: 15, width: props.width, backgroundColor: props.bg }} align={props.align || "right"}>{props.children}</TableCell>
}

export function SmallTableCellLeft(props) {
    return <TableCell style={{ fontSize: 15, width: props.width, backgroundColor: props.bg }} >
        <div dir={"ltr"}>
            {props.children}
        </div>
    </TableCell>
}

export function SmallTableCellEditable(props) {
    return <SmallTableCell {...props}>
        <div dir={props.dir}>
            <InputBase
                style={{ width: '100%' }}
                value={props.value}
                onChange={props.onChange}
            />
        </div>
    </SmallTableCell>
}


export function Text(props) {
    return <div style={{ textAlign: props.textAlign || 'right', fontSize: props.fontSize || 25, padding: 10 }}>{props.children}</div>
}

export const getBallsIndicator = (player, inMatch) => player && player.balls && player.balls > 0 ? (
    <VBox style={{ alignContent: "center" }}>
        <SportsBaseballSharpIcon style={{ color: inMatch ? 'red' : '#DAE714', transform: "rotate(45deg)", fontSize: inMatch ? 20 : 25 }} />
        <div style={{ position: "absolute", width: 20, height: 20, backgroundColor: "transparent" }}>
            <SmallText2 textAlign="center" fontSize={inMatch ? 15 : 10} fontWeight={inMatch ? "bold" : "normal"}>{player.balls}</SmallText2>
        </div>
    </VBox>) :
    null

export const getReplacementIndicator = (player) => player?._activeReplacementRequest && (
    <VBox style={{ alignContent: "center" }}>
        <FindReplace style={{ color: 'red', fontSize: 25 }} />
    </VBox>)

export function BoxInput(props) {
    return <div className="Sunken" style={{
        backgroundColor: props.backgroundColor,
        justifyItem: 'center',
        width: 40, height: 50, margin: 5
    }}>
        {props.tieBreak ? <SmallText2 textAlign={'center'} fontSize={8}>שובר שוויון</SmallText2> : null}
        <InputBase
            inputRef={ref => props && props.focus ? (ref && ref.focus ? ref.focus() : {}) : {}}
            onChange={(e) => {
                props.onChange(e.currentTarget.value)

                if (e.currentTarget.value !== "" && props.onNextFocus)
                    props.onNextFocus();
            }}
            onFocus={() => props.onFocus ? props.onFocus() : {}}
            value={props.value} fullwidth={true}
            inputProps={{ pattern: "[0-9]*", style: { textAlign: 'center' } }}
            style={{ height: '100%' }} />
    </div>
};


export function HThinSeparator(props) {
    return <div style={{ height: 1, width: props.width || '95%', borderTop: "1px solid lightgray " }}></div>
}

export function HSeparator() {
    return <div style={{ height: 4, width: '100%', borderTop: "2px solid lightgray " }}></div>
}
export function CircledValue(props) {
    return <div style={{
        display: 'flex',
        borderRadius: '50%',
        width: props.size,
        height: props.size,
        textAlign: 'center',
        alignItems: 'center',
        alignContent: 'center',
        backgroundColor: props.backgroundColor || 'black',
        color: props.color || 'white'
    }}><SmallText2 textAlign={'center'} fontSize={props.size * .55}>{props.children}</SmallText2></div>
}

export function SmallText(props) {
    return <div style={{ textAlign: props.textAlign || 'right', color: props.color, fontSize: props.fontSize || 15, padding: 2 }}>{props.children}</div>
}

export function SmallText2(props) {
    return <div style={{
        width: props.width || '100%',
        textAlign: props.textAlign || 'right',
        fontSize: props.fontSize || 12,
        fontWeight: props.fontWeight,
        textDecoration: props.textDecoration,
        lineHeight: props.lineHeight,
        marginTop: props.marginTop,
        padding: 0,
        backgroundColor: props.backgroundColor,
        color: props.color,
        transform: props.transform || undefined
    }}>{props.children}</div>
}

export function ltr(props) {
    return <div dir="ltr">{props.children}</div>
}

export function SVGIcon(props) {
    let src = "";
    let div = false;
    switch (props.svg) {
        case "editResults":
            src = require("./edit-results.svg").default;
            break;
        case "betPlus":
            src = require("./bet+.svg").default;
            break;
        case "betMinus":
            src = require("./bet-.svg").default;
            break;
        case "bet":
            src = require("./bet.svg").default;
            break;
        case "betWithColor":
            div = true;
            src = <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
                    viewBox="0 0 512 512" fill={props.color} stroke={props.color} >
                    <g transform="translate(1 1)">
                        <g>
                            <g>
                                <path d="M507.587,297.667l0.373-3.355c1.744-11.191,2.746-22.617,2.976-34.224c0.039-1.711,0.065-3.412,0.065-5.087
				s-0.026-3.376-0.065-5.087c-0.229-11.607-1.232-23.033-2.975-34.224l-0.373-3.356H507.4
				c-6.634-39.113-22.21-75.281-44.547-106.306l0.361-0.361l-4.267-5.973C444.44,80.92,427.373,64.707,408.6,50.2l-5.973-5.12
				l-0.647,0.647C371.404,24.149,335.945,9.092,297.667,2.6V2.413l-5.523-0.69c-4.646-0.683-9.332-1.235-14.054-1.662
				c-0.444-0.041-0.887-0.08-1.33-0.119c-1.046-0.089-2.092-0.179-3.141-0.255c-1.802-0.135-3.602-0.25-5.399-0.345
				c-0.118-0.006-0.236-0.01-0.354-0.016c-1.984-0.102-3.967-0.175-5.948-0.228c-0.198-0.005-0.396-0.011-0.594-0.016
				c-2.049-0.05-4.098-0.081-6.146-0.078C255.118-0.998,255.059-1,255-1c-0.352,0-0.7,0.012-1.052,0.013
				c-1.222,0.008-2.444,0.021-3.666,0.047c-11.735,0.215-23.285,1.218-34.595,2.98l-3.354,0.373V2.6
				c-37.652,6.386-72.57,21.063-102.803,42.077l-0.451-0.451l-5.973,4.267C84.333,63,67.267,79.213,51.907,97.987l-4.267,5.973
				l0.588,0.588C25.316,135.901,9.34,172.595,2.6,212.333H2.413l-0.373,3.354c-1.49,9.562-2.43,19.299-2.82,29.17
				c-0.032,0.745-0.061,1.493-0.086,2.242c-0.024,0.769-0.046,1.538-0.063,2.308C-0.971,251.257-1,253.115-1,255
				s0.029,3.743,0.071,5.592c0.017,0.771,0.04,1.539,0.063,2.308c0.025,0.749,0.054,1.496,0.086,2.242
				c0.39,9.872,1.33,19.608,2.82,29.17l0.373,3.355H2.6c6.528,38.488,21.709,74.127,43.476,104.817l-0.143,0.143L50.2,408.6
				c13.653,18.773,30.72,34.987,49.493,50.347l5.973,4.267l0.364-0.359c31.024,22.336,67.191,37.912,106.303,44.545v0.187
				l3.355,0.373c11.191,1.744,22.617,2.746,34.224,2.976c1.711,0.039,3.412,0.065,5.087,0.065s3.376-0.026,5.087-0.065
				c11.607-0.229,23.033-1.232,34.224-2.975l3.356-0.373V507.4c39.946-6.775,76.817-22.883,108.278-45.988l0.095,0.095l1.304-1.118
				c12.153-9.051,23.478-19.155,33.851-30.168c7.354-7.666,14.18-15.749,20.312-24.181l4.267-5.973l-0.101-0.101
				c20.827-30.116,35.377-64.857,41.727-102.299H507.587z M493.891,258.32c-0.18,7.427-0.922,14.853-1.664,22.28h-51.2
				c0.048-0.475,0.094-0.95,0.142-1.426c0.89-6.845,1.398-13.805,1.522-20.854c0.027-1.107,0.042-2.214,0.042-3.321
				s-0.016-2.214-0.042-3.321c-0.124-7.049-0.632-14.009-1.522-20.854c-0.047-0.475-0.094-0.95-0.142-1.425h51.2
				c0.743,7.427,1.484,14.853,1.664,22.28c0.015,1.106,0.042,2.21,0.042,3.32C493.933,256.11,493.906,257.214,493.891,258.32z
				 M490.085,212.333h-52.28c-4.824-20.554-13.055-39.831-24.051-57.207l36.871-36.871
				C470.067,145.935,483.807,177.873,490.085,212.333z M407.226,438.799l-36.173-36.173c5.419-4.335,10.683-9.133,15.731-14.257
				c7.011-6.929,13.481-14.402,19.344-22.349l36.86,36.022C432.405,415.527,420.407,427.853,407.226,438.799z M399.37,345.717
				l-1.01,1.443c-11.947,18.773-27.307,34.133-45.227,46.933l-8.533,5.973l0.002,0.002c-15.508,9.637-32.649,16.866-50.897,21.139
				l-6.277,1.046c-21.333,4.267-42.667,4.267-64.853,0l-6.278-1.046c-17.782-4.164-34.518-11.126-49.711-20.397l-7.158-5.01
				c-4.479-2.85-8.757-5.949-12.847-9.25c-8.247-6.815-15.843-14.392-22.691-22.611c-0.281-0.341-0.568-0.678-0.846-1.022
				c-0.069-0.084-0.136-0.17-0.205-0.254c-3.372-4.184-6.537-8.511-9.492-12.943l-1.965-2.808
				c-10.368-16.108-18.103-34.051-22.588-53.208l-1.046-6.278c-1.262-5.47-2.107-10.94-2.641-16.308
				c-0.038-0.4-0.073-0.801-0.108-1.202c-0.071-0.776-0.137-1.55-0.195-2.32c-0.081-1.095-0.151-2.192-0.21-3.292
				c-0.013-0.243-0.03-0.489-0.042-0.731c-0.061-1.217-0.105-2.437-0.14-3.66c-0.006-0.217-0.017-0.437-0.022-0.654
				c-0.035-1.416-0.054-2.836-0.054-4.26s0.019-2.844,0.054-4.26c0.005-0.216,0.016-0.437,0.022-0.654
				c0.035-1.223,0.079-2.444,0.14-3.66c0.012-0.243,0.029-0.488,0.042-0.732c0.06-1.1,0.13-2.197,0.21-3.291
				c0.059-0.774,0.125-1.552,0.196-2.331c0.035-0.397,0.069-0.793,0.106-1.189c0.535-5.369,1.379-10.839,2.642-16.31l1.046-6.278
				c14.738-62.938,64.564-112.764,127.502-127.502l6.278-1.046c21.333-4.267,42.667-4.267,64.853,0l6.278,1.046
				c31.28,7.325,59.318,23.317,81.424,45.278c4.381,4.41,8.551,9.031,12.513,13.861c15.942,19.689,27.616,42.955,33.566,68.364
				l1.046,6.278c0.952,4.125,1.666,8.131,2.19,12.107c0.8,6.667,1.223,13.446,1.223,20.32c0,0.003,0,0.006,0,0.009
				c-0.001,10.238-1.707,21.328-3.413,32.418l-1.046,6.277C416.831,312.391,409.357,329.917,399.37,345.717z M280.6,492.227
				c-17.067,1.707-34.133,1.707-51.2,0v-51.2c17.067,2.56,34.133,2.56,51.2,0V492.227z M68.143,403.457l36.45-36.45
				c10.282,13.751,22.404,26.052,35.984,36.55l-36.395,36.395C90.914,429.103,78.827,416.862,68.143,403.457z M107.488,67.381
				l36.491,36.491c-13.82,10.195-26.211,22.228-36.794,35.739l-36.375-36.375C81.725,90.025,94.028,77.999,107.488,67.381z
				 M251.679,67.309c-7.049,0.124-14.009,0.632-20.854,1.522c-0.475,0.047-0.95,0.094-1.425,0.142v-51.2
				c17.067-1.707,34.133-1.707,51.2,0v51.2c-0.475-0.048-0.95-0.094-1.426-0.142c-6.845-0.89-13.805-1.398-20.854-1.522
				c-1.107-0.027-2.214-0.042-3.321-0.042S252.786,67.282,251.679,67.309z M440.333,104.653l-36,36
				c-11.093-13.653-23.04-25.6-36.693-35.84l36.29-36.29C417.307,79.241,429.517,91.359,440.333,104.653z M389.731,57.976
				l-36.956,36.956c-16.824-10.34-35.379-18.107-55.108-22.737v-52.28C331.294,26.041,362.519,39.273,389.731,57.976z
				 M212.333,19.915v52.28c-19.109,4.485-37.113,11.914-53.513,21.772l-37.037-37.037C148.635,38.775,179.331,25.927,212.333,19.915
				z M60.428,116.748l36.813,36.813c-11.498,17.78-20.077,37.6-25.046,58.773h-52.28C26.307,177.249,40.423,144.772,60.428,116.748z
				 M67.309,251.679c-0.027,1.107-0.042,2.214-0.042,3.321s0.016,2.214,0.042,3.321c0.124,7.049,0.632,14.009,1.522,20.854
				c0.047,0.475,0.094,0.95,0.142,1.426h-51.2c-0.743-7.427-1.484-14.853-1.664-22.28c-0.015-1.106-0.042-2.21-0.042-3.32
				c0-1.11,0.027-2.214,0.042-3.32c0.18-7.427,0.922-14.853,1.664-22.28h51.2c-0.048,0.475-0.094,0.95-0.142,1.425
				C67.941,237.671,67.433,244.63,67.309,251.679z M19.915,297.667h52.28c4.679,19.935,12.563,38.669,23.066,55.633l-36.935,36.935
				C39.439,362.905,26.079,331.502,19.915,297.667z M118.358,450.696l37.189-36.679c17.267,10.863,36.398,19.003,56.787,23.788
				v52.28C177.916,483.815,146.014,470.101,118.358,450.696z M297.667,490.085v-52.28c21.378-5.017,41.374-13.719,59.287-25.385
				l36.792,36.792C365.609,469.405,332.959,483.656,297.667,490.085z M453.41,387.703l-37.059-37.059
				c9.698-16.257,17.018-34.076,21.454-52.978h52.28C484.111,330.46,471.383,360.973,453.41,387.703z"/>
                            </g>
                        </g>
                    </g>
                </svg>;
            break;
        case "replacementRequest":
            src = require("./replacement.svg").default;
            break;
        case "cancelReplacementRequest":
            src = require("./replacementCancel.svg").default;
            break;
        default:
    }

    if (div) {
        return <div {...props} style={{ ...props.style, height: props.size, width: props.size }}>{src}</div>
    }

    return <img src={src} alt="" {...props} style={{ ...props.style, height: props.size, width: props.size }} />
}

export function Card(props) {
    return <Box style={{
        display: 'flex',
        width: props.width || '94%',
        marginRight: '3%',
        marginLeft: '3%',
        marginBottom: 10,
        borderRadius: 4,
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'white',
        boxShadow: "1px 2px 1px #9E9E9E",
        ...props.style
    }}>
        {props.children}
    </Box>
}

export function VBox(props) {
    return <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...props.style }}>
        {props.children}
    </Box>
}
export const VBoxC = (props) => (<VBox style={{ alignItems: "center", justifyContent: "center", width: "100%", ...props.style }} >{props.children}</VBox>);


export const HBoxC = (props) => (<HBox style={{ alignItems: "center", justifyContent: "center", width: "100%", ...props.style }} >{props.children}</HBox>);
export const HBoxSB = (props) => (<HBox style={{ alignItems: "center", justifyContent: "space-between", width: "100%", ...props.style }} >{props.children}</HBox>);


export function HBox(props) {
    return <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', ...props.style }}>
        {props.children}
    </Box>
}

export function Search(props) {
    return (
        <div dir="rtl" >
            <TextField label="חפש" type="search" variant="outlined" size="small" style={{ width: 200 }}
                onChange={(e) => props.onChange ? props.onChange(e.currentTarget.value) : {}}
            />
        </div>)
}

export const ItemTypes = {
    BOX: 'box',
}




export function Loading(props) {
    return <div style={{
        dir: "rtl",
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        alignContent: 'center',
        justifyItems: 'center',
        //backgroundColor:'green'
    }}>
        <CircularProgress /><Text fontSize={35} textAlign={"center"}>{props.msg}</Text>
    </div>
}

export const Picker = (props) => {
    return (<FormControl fullWidth>
        {props.name && <InputLabel >{props.name}</InputLabel>}
        <Select
            native={false}
            value={props.value}
            label={props.value}
            onChange={(event) => props.onChange(event.target.value)}
        >
            {props.values.map((val, i) => <MenuItem key={i} value={val}>{val}</MenuItem>)}
        </Select>
    </FormControl>)
}


export const IOSSwitch = withStyles((theme) => ({
    root: {
        width: 42,
        height: 26,
        padding: 0,
        margin: theme.spacing(1),
    },
    switchBase: {
        padding: 1,
        '&$checked': {
            transform: 'translateX(16px)',
            color: theme.palette.common.white,
            '& + $track': {
                backgroundColor: '#52d869',
                opacity: 1,
                border: 'none',
            },
        },
        '&$focusVisible $thumb': {
            color: '#52d869',
            border: '6px solid #fff',
        },
    },
    thumb: {
        width: 24,
        height: 24,
    },
    track: {
        borderRadius: 26 / 2,
        border: `1px solid ${theme.palette.grey[400]}`,
        backgroundColor: theme.palette.grey[50],
        opacity: 1,
        transition: theme.transitions.create(['background-color', 'border']),
    },
    checked: {},
    focusVisible: {},
}))(({ classes, ...props }) => {
    return (
        <Switch
            focusVisibleClassName={classes.focusVisible}
            disableRipple
            classes={{
                root: classes.root,
                switchBase: classes.switchBase,
                thumb: classes.thumb,
                track: classes.track,
                checked: classes.checked,
            }}
            {...props}
        />
    );
});

export function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <Typography
            component="div"
            role="tabpanel"
            hidden={value !== index}
            id={`scrollable-auto-tabpanel-${index}`}
            {...other}
            style={{ padding: 0 }}
        >
            {props.title ? <h1 align="center">{props.title}</h1> : null}
            <Box style={{ padding: 2 }} p={3}>{children}</Box>
        </Typography>
    );
}
