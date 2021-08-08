import * as React from 'react';
import { CircularProgress, TableCell ,Box, Paper, Card, Typography } from '@material-ui/core';
import Draggable from "react-draggable";


export function Spacer(props) {
    return <div style={{width:props.width || 5, height: props.height || 5}} />
}
export function Header(props) {
    return <div style={{fontSize:35, padding:10}}>{props.children}</div>
}

export function Paper1(props) {
    return <Paper elevation={3} style={{ width: props.width ? props.width : '27%', height: '85vh', ...props.style }} {...props}>{props.children}</Paper>
}


export function Toolbar(props) {
    return <div style={{flex:1, flexDirection:'row', height: 30, alignItems:'flex-start'}}>{props.children}</div>
}

export function MyTableCell(props) {
    return <TableCell style={{fontSize:25}} align="right">{props.children}</TableCell>
}


export function Text(props) {
    return <div style={{ textAlign:props.textAlign || 'right', fontSize:props.fontSize || 25, padding:10}}>{props.children}</div>
}

export function VBox(props) {
    return <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...props.style }}>
        {props.children}
    </Box>
}

export function HBox(props) {
    return <Box style={{ display: 'flex',  flexDirection: 'row', alignItems: 'flex-start', ...props.style }}>
        {props.children}
    </Box>
}

export function DraggableCard({ text, bgColor }) {
    return (
      <Draggable>
        <Card
          style={{ width: "40%", backgroundColor: bgColor, color: "#ffffff" }}
        >
          {/* <Button variant="text">BUY</Button> */}
          <Typography variant="h6">{text}</Typography>
        </Card>
      </Draggable>
    );
  };
  

export function Loading(props) {
    return <div style={{
        dir:"rtl",
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