import React, { Component } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator  
} from 'react-native-web';
import io from 'socket.io-client';
import theme from './theme';
import { CircularProgressbar } from 'react-circular-progressbar';
const {
  height,
  width
} = Dimensions.get('window')
const server_url = 'http://5.181.217.24:3030';
const school_id = 1;
export default class App extends Component {
  constructor(props){
    super(props)
    this.state = {
      list : [],
      error : false,
      busy : false,
      creating : false,
      refresh : false,
    }
    this.socket = null;
  }
  
  componentDidMount () {
    this.socket = io.connect(server_url);
    this.handleSocket();
    this.getTaskList();
  }

  componentWillUnmount () {
    if(this.socket != null){
      this.socket.close();
    }
  }

  getTaskList = async () => {
    this.setState({busy : true, error : false, list : []});
    const response = fetch(`${server_url}/get_task_list`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
       school_id,
      }),
    })
    .then((response) => response.json())
    .then((res) => {      
      if(res.status == 200 || res.status == 400){
        console.log(res)
        const list = res.list || []
        this.setState({busy : false, error : false, list}, () => {
          this.socket.emit('join_room', {
            room_name : res.room_name
          })
        });
      }else{
        this.showError();
      }      
    })
    .catch((error) => {
     this.showError();
    });
  }

  createTask = async () => {
    this.setState({creating : true});
    const timestamp = parseInt(new Date().getTime() / 1000);
    const task = {
      id : timestamp,
      name : `Task ${timestamp}`
    }
    const response = fetch(`${server_url}/create_new_task`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
       school_id,
       task
      }),
    })
    .then((response) => response.json())
    .then((res) => {      
      if(res.status == 200){
        const list = this.state.list;
        task.progress = 0;
        list.push(task)
        this.setState({
          creating : false,
          list,
          refresh : !this.state.refresh
        });
      }else{
        this.createError();
      }      
    })
    .catch((error) => {
     this.createError();
    });
  }

  handleSocket = () => {
    this.socket.on('connect', () => {
      this.setState({
        socketConnected:true
      })      
    });

    this.socket.on('disconnect', () => {
      this.setState({
        socketConnected:false
      })
    });

    this.socket.on('progress', (data) => {
      this.handleProgress(data);
    });
  }

  handleProgress = (task) => {
    const {list, refresh} = this.state;
    let idx = list.findIndex(t => t.id == task.id);
    if(idx != -1){
      if(task.progress == 100){
        list.splice(idx, 1)
      }else{
        list[idx] = task;
      }
      this.setState({
        list,
        refresh : !refresh
      })
    }
  }

  showError = () => {
    this.setState({busy:false,error:true})
  }

  createError = () => {
    this.setState({
      creating:false
    }, () => {
      alert('Unable to create task')
    })
  }

  render () {
    const {
      busy,
      error,
      creating      
    } = this.state;
    return (
      <View style={s.main}>
        {this.renderContent(busy, error)}        
        <LoadingModal visible={creating} />
      </View>
    )
  }

  renderContent = (busy, error) => {
    if(error){
      return (
        <View style={s.indicatorCard}>
         <Text style={s.errorTxt} onPress={this.getTaskList}>Press here to try again!</Text>
        </View>
      )
    }else if(busy){
      return (
        <View style={s.indicatorCard}>
         <ActivityIndicator size={35} color={theme.primary} />
        </View>
      )
    }else{
      const {
        list,
        refresh
      } = this.state;
      return (
        <View style={s.contentCard}>
          <FlatList
           data={list}
           extraData={refresh}
           renderItem={this.renderTask}
           ListEmptyComponent={this.renderEmpty}
          />
          <TouchableOpacity onPress={this.createTask} style={s.createBtn}>
           <Text style={s.createBtnTxt}>Create New Task</Text>
          </TouchableOpacity>
        </View>
      );
    }
  }

  renderEmpty = () => {
    return (
      <View style={s.indicatorCard}>
        <Text style={s.errorTxt}>No Tasks to Show!</Text>
      </View>
    )
  }

  renderTask = ({item : {name, progress}}) => {
    return (
      <View style={s.task.main}>
       <Text style={s.task.name}>{name}</Text>
       <View style={s.task.progressCover}>
         <CircularProgressbar
          value={progress}
          text={`${progress}%`}
         />
       </View>
      </View>
    )
  }
}

class LoadingModal extends Component {
  render () {
    return (
      <Modal visible={this.props.visible} transparent animationType="fade">
      <View style={s.loadingModal}>
       <ActivityIndicator size={35} color={theme.primary} />
      </View>
      </Modal>
    )
  }
}

const s = {
  task : {
    main : {
      width : '100%',
      height : 60,
      borderRadius : 10,
      borderColor : theme.grey,
      padding : 10,
      alignItems : 'center',
      flexDirection : 'row',
      marginBottom : 10
    },
    name : {
      fontSize : 16,
      color : theme.silver,
      flex : 1,
      fontWeight : '500'
    },
    progressCover : {
      height : 60,
      width : 60,
      justifyContent : 'center',
      alignItems : 'center'
    }
  },
  main : {
    width : width,
    height : height,
    justifyContent : 'center',
    alignItems : 'center',
    backgroundColor : theme.bgColor
  },
  contentCard : {
    width : 400,
    padding : 10,
    borderRadius : 10,
    backgroundColor : theme.grey24
  },
  createBtn : {
    width : '100%',
    height : 50,
    justifyContent : 'center',
    alignItems : 'center',
    borderRadius : 10,
    backgroundColor : theme.primary
  },
  createBtnTxt : {
    fontSize : 15,
    color : theme.bgColor,
    fontWeight : 'bold'
  },
  loadingModal : {
    width : '100%',
    height : '100%',
    backgroundColor : theme.bgTrans,
    justifyContent : 'center',
    alignItems : 'center'
  },
  indicatorCard : {
    height : 400,
    width : 400,
    justifyContent : 'center',
    alignItems : 'center'
  },
  errorTxt : {
    fontSize : 20,
    fontWeight : 'bold',
    color : theme.primary
  }
}