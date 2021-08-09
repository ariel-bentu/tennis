import { useDrop } from 'react-dnd';
import { ItemTypes , Spacer, VBox} from './elem';
import { Box } from './drag-box'
const style = {
    display: 'flex',
    height: '100%',
    minHeight: '2rem',
    minWidth:'8rem',
    width: '100%',
    border: '1px solid black',
    padding: 2,
    textAlign: 'center',
    
    
    backgroundColor: 'transparent'
};
export const Dustbin = (props) => {
    const [{ canDrop, isOver }, drop] = useDrop(() => ({
        accept: ItemTypes.BOX,
        drop: () => {
            return {
                onDrop: (player) => props.AddPlayer(player) ,
                target: props.target
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }));
    const isActive = canDrop && isOver;
    if (isActive) {
        style.backgroundColor = 'darkkhaki';
    }
    else {
        style.backgroundColor = 'transparent';
    }
    return (<div ref={drop} style={{ ...style }}>
        <VBox>
            {props.Player1 ? <Box source={props.target} user={props.Player1}  height={'1rem'} onRemove={()=>{}}/> : null}
            <Spacer/>
            {props.Player2 ? <Box source={props.target} user={props.Player2}  height={'1rem'} onRemove={()=>{}}/> : null}
        </VBox>
    </div>);
};
