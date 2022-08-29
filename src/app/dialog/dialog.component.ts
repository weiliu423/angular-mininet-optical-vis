import {Component, Inject} from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

export interface DialogData {
  animal: string;
  name: string;
}

/**
 * @title Dialog Overview
 */
@Component({
    selector: 'app-dialog',
    templateUrl: './dialog.component.html',
    styleUrls: ['./dialog.component.css']
})
export class DialogComponent {

  constructor(public dialog: MatDialog) {}

  openDialog(title:string, data: any): void {
    const dialogRef =  this.dialog.open(DialogData, {
      data : {data, title}
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }
}

@Component({
  selector: 'dialog-data',
  templateUrl: './dialog-data.component.html',
  styleUrls: ['./dialog.component.css']
})
export class DialogData {
  constructor(
    public dialogRef: MatDialogRef<DialogData>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {
    dialogRef.disableClose = true;
  }
  public rows: any;
  public mainKey : any;
  public subKeys: any;
  public data_row: any = [];
  public data_row_value: any = [];
  public no_data_resp: string = "NO DATA FOUND!"
  title!: string;
  ngOnInit() {
    this.title = this.data.title;
    if(this.data.data === undefined)
    {
      console.log(this.no_data_resp)
    }
    else{
      const obj = JSON.parse(this.data.data.toString());
      this.rows = Object.values(obj);
      this.rows.forEach((element:any, index: any) => {
        let dictKey = Object.values(element);
        dictKey.forEach((keys:any) =>{
          this.subKeys = Object.keys(keys)
          this.subKeys = this.subKeys.map((x : any) => { return x.toUpperCase(); })
          return
        })
      })
      for (let key in this.rows[0]) {
        //this.data_row
        this.data_row_value = []
        let value = this.rows[0][key];
        this.data_row_value.push(key)
        for(let data_value in value)
        {
          let data_values = value[data_value]
          this.data_row_value.push(data_values)
        }
        this.data_row.push(this.data_row_value)    
      }
    }
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}


/**  Copyright 2022 Google LLC. All Rights Reserved.
    Use of this source code is governed by an MIT-style license that
    can be found in the LICENSE file at https://angular.io/license */