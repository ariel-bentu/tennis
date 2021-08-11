import * as React from 'react';
import { CircularProgress, TableCell, Box, Paper , InputBase} from '@material-ui/core';


export function Spacer(props) {
    return <div style={{ width: props.width || 5, height: props.height || 5 }} />
}
export function Header(props) {
    return <div style={{ fontSize: 35, padding: 10 }}>{props.children}</div>
}

export function Paper1(props) {
    return <Paper elevation={3} style={{display:'flex', width: props.width ? props.width : '27%', height: '85vh', ...props.style }} {...props}>{props.children}</Paper>
}


export function Toolbar(props) {
    return <div style={{ flex: 1, flexDirection: 'row', height: 30, alignItems: 'flex-start' }}>{props.children}</div>
}

export function MyTableCell(props) {
    return <TableCell style={{ fontSize: 25, padding:0 , width:props.width }} align="right">{props.children}</TableCell>
}

export function SmallTableCell(props) {
    return <TableCell padding={'none'} style={{ fontSize: 15, width:props.width, backgroundColor:props.bg}} align="right">{props.children}</TableCell>
}

export function SmallTableCeEditable(props) {
    return <SmallTableCell {...props}><InputBase
    style={{ width:'100%' }}
        value={props.value}
        onChange={props.onChange}
    /></SmallTableCell>
}


export function Text(props) {
    return <div style={{ textAlign: props.textAlign || 'right', fontSize: props.fontSize || 25, padding: 10 }}>{props.children}</div>
}

export function VBox(props) {
    return <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...props.style }}>
        {props.children}
    </Box>
}

export function HBox(props) {
    return <Box style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', ...props.style }}>
        {props.children}
    </Box>
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