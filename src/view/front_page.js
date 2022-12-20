import * as React from 'react';
import {
    Box,
    Button,
    Grid,
    Paper,
    Table, TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography
} from "@mui/material";
import {styles_} from "../const/styles";
import {useNavigate} from "react-router-dom";
import axios from "axios";

class FrontPageView extends React.Component {
    render() {
        const _viewShowSelectedData = () => {
            if (this.state.allCompleted === false || this.state.selectedData === undefined) {
                return (<div/>)
            }

            if (this.state.selectedData.complete === false) {
                return (<div/>)
            }

            return (
                <Grid container direction="row">
                    <Grid xs={6}>
                        <TextField xs={12}
                                   id="outlined-multiline-static"
                                   label=""
                                   multiline
                                   inputProps={
                                       {readOnly: true,}
                                   }
                                   rows={30}
                                   variant="outlined"
                                   style={{width: "100%", height: "100%"}}
                                   value={JSON.stringify(this.state.selectedData.result.bbox, null, 3)}
                        />
                    </Grid>
                    <Grid xs={6}>
                        <Box component="img"
                             sx={styles_.image_proc_}
                             src={this.state.selectedData.result.file_name}/>
                    </Grid>
                </Grid>
            );
        }

        return (
            <Grid container sx={styles_.main_grid_container}>
                <Grid sx={styles_.grid_title_app}>
                    <Typography sx={styles_.title_app}>Yolo v5 - Object Detection</Typography>
                    <Typography sx={styles_.title_app_desc}>Demo application showing how to consume the API which
                        performs object detection using Yolo v5.</Typography>
                </Grid>

                <Grid container direction="row" sx={{mb: 1}}>
                    <TextField
                        size={"small"}
                        id="outlined-basic"
                        type="file"
                        inputProps={{multiple: true}}
                        onChange={this.onChangeInputFiles} sx={{mr: 1}}/>
                    <Button variant="outlined" onClick={this.httpPostUploadFiles}>Upload</Button>
                </Grid>

                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell style={{width: 50, backgroundColor: "black", color: "white"}}>No</TableCell>
                                <TableCell style={{backgroundColor: "black", color: "white"}}>Task ID</TableCell>
                                <TableCell
                                    style={{width: 150, backgroundColor: "black", color: "white"}}>Object</TableCell>
                                <TableCell
                                    style={{width: 150, backgroundColor: "black", color: "white"}}>Status</TableCell>
                                <TableCell
                                    style={{width: 100, backgroundColor: "black", color: "white"}}>View</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {this.state.datas.map((row) => (
                                <TableRow sx={{'&:last-child td, &:last-child th': {border: 0}}}>
                                    <TableCell key={"0"}>{row.id}</TableCell>
                                    <TableCell key={"1"}>{row.task_id}</TableCell>
                                    <TableCell
                                        key={"2"}>{row.complete ? row.result.bbox === undefined ? 0 : row.result.bbox.length : 0}</TableCell>
                                    <TableCell key={"3"}>{row.status}</TableCell>
                                    <TableCell key={"4"}><Box component="img"
                                                              sx={styles_.image_proc_thumbnail}
                                                              src={row.complete ? row.result.file_name : ""}
                                                              onClick={() => this.updateSelectedData(row)}/></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                {_viewShowSelectedData()}
            </Grid>
        );
    }

    constructor(props) {
        super(props)
        this.procInterval = null
        this.intervalInMs = 2000
        this.state = {
            loading: true,
            inputFiles: [],
            response: {},
            inputParam: [],
            datas: [],
            allCompleted: false,
            selectedData: undefined,
        }
    }

    onChangeInputFiles = (v) => {
        let tmp_data = []
        for (let i = 0; i < v.target.files.length; i++) {
            tmp_data.push({id: i + 1, task_id: "file: " + v.target.files[i].name, status: "", view: false})
        }

        this.setState({
            inputFiles: v.target.files,
            datas: tmp_data,
            selectedData: undefined
        })
    };

    httpPostUploadFiles = () => {
        this.setState({
            allCompleted: false
        })

        let form_data = new FormData();
        for (let i = 0; i < this.state.inputFiles.length; i++)
            form_data.append('files', this.state.inputFiles[i]);

        // get process
        axios.post("/api/yolo/process", form_data)
            .then((response) => {
                let temp_data = []
                for (let i = 0; i < response.data.length; i++) {
                    let item = response.data[i]
                    temp_data.push({
                        id: i + 1,
                        task_id: item.task_id,
                        status: item.status,
                        complete: false,
                        result: {file_name: "", bbox: []}
                    })

                    this.checkStatusInInterval();
                }
                this.setState({
                    loading: false,
                    datas: temp_data,
                })
            })
            .catch((error) => {
                this.setState({
                    loading: false,
                })
            })
    }

    updateSelectedData = (row) => {
        this.setState({
            selectedData: row
        })
    }

    isStatusCompleted(v) {
        return (v.status.toLowerCase() === "success") || (v.status.toLowerCase() === "failed");
    }

    checkStatusInInterval = () => {
        clearInterval(this.procInterval);
        this.procInterval = setInterval(this.httpPostCheckTaskStatus, this.intervalInMs);
    }

    httpPostCheckTaskStatus = () => {
        let nFiles = this.state.datas.length
        for (let i = 0; i < nFiles; i++) {
            let item = this.state.datas[i]
            if (this.isStatusCompleted(item))
                continue

            axios.get("/api/yolo/result/" + item.task_id, {})
                .then((response) => {
                    let temp_data = this.state.datas
                    temp_data[i].status = response.data.status
                    if (this.isStatusCompleted(response.data)) {
                        temp_data[i].complete = true
                        temp_data[i].result = response.data.result
                    }

                    this.setState({
                        loading: false,
                        datas: temp_data
                    })
                })
                .catch((error) => {
                    clearInterval(this.procInterval);
                })
        }

        let nProcCount = 0
        for (let i = 0; i < nFiles; i++) {
            let item = this.state.datas[i]
            if (this.isStatusCompleted(item))
                nProcCount += 1
        }

        if (nProcCount === nFiles) {
            clearInterval(this.procInterval);
            this.setState({
                allCompleted: true
            })
        }
    }
}

function FrontPage(props) {
    let navigate = useNavigate();
    return <FrontPageView {...props} navigate={navigate}/>
}

export default FrontPage
