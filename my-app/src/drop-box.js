import { useDrop } from 'react-dnd';
import { ItemTypes, VBox } from './elem';
import { Box } from './drag-box'
const style = {
    display: 'flex',
    
    minHeight: '2rem',
    minWidth: 105,


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
                onDrop: (user, source) => props.AddPlayer(user, source),
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
    return (<div ref={drop} style={{ display: 'flex', ...style }}>
        <VBox>
            {props.Player ? <Box source={props.source} sourcePair={props.sourcePair} user={props.Player}
                backgroundColor={props.Player._order ? 'lightblue' : 'yellow'} width={props.width}
                additionalInfo={props.Player._otherRegistrations}
            onRemove={props.onRemove}/> : null}
        </VBox>
    </div>);
};
