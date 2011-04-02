//Class BuildAction
function BuildAction(villageId, buildingId) 
{
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
	
	this.buildingId = buildingId;
}

BuildAction.Extends(BaseHttpAction, 
{
	//Prototype, put Member Functions here.
	start:	function() 
	{
		postDebug("准备建: "+ this.buildingId +" 号", this);
		this.sendRequest("build.php?id="+this.buildingId, null, this.buildAction1);
	},
	buildAction1:	function(doc) 
	{
		if (doc.indexOf('<span class="c">资源不足</span>') >= 0 || doc.indexOf('资源何时充足时间提示') >= 0) 
		{
			postMessage("资源不足");
			this.end(NOT_READY);
			return;
		}
		if (doc.indexOf("已经有建筑在建造中") >= 0 || doc.indexOf("等待队列中") >= 0) 
		{
			postMessage("已经有建筑在建造中");
			this.end(NOT_READY);
			return;
		}
		if (doc.indexOf("粮食产量不足: 需要先建造一个农场") >= 0) 
		{
			postError("粮食产量不足: 需要先建造一个农场");
			this.end(ERROR);
			return;
		}
		if (doc.indexOf("建造所需资源超过仓库容量上限,请先升级你的仓库") >= 0) 
		{
			postError("建造所需资源超过仓库容量上限,请先升级你的仓库");
			this.end(ERROR);
			return;
		}
		if (doc.indexOf("建造完成") >= 0 || doc.indexOf("将马上开始全部建造") >= 0) 
		{
			postError("建造完成");
			this.end(ERROR);
			return;
		}
		
		var info;
		if (doc.indexOf("dorf1.php?a=") >= 0) 
		{
			//Building Outer Town
			info = getStrBetween(doc, "dorf1.php?a=", '">', null);//<a href="dorf1.php?a=12&c=5a1">升级到等级4</a>
			this.sendRequest("dorf1.php?a="+info, null, this.buildAction2);
		} 
		else if (doc.indexOf("dorf2.php?a=") >= 0) 
		{
			//Building inner Town
			info = getStrBetween(doc, "dorf2.php?a=", '">', null);//<a href="dorf2.php?a=29&c=cf1">升级到等级5</a>
			this.sendRequest("dorf2.php?a="+info, null, this.buildAction2);
		} 
		else 
		{
			postMessage("未打开 建筑/矿田 页面,信息: "+ getStrBetween(doc, '<span class="c">', '</span>', null) );//<span class="c">资源不足</span>
			this.end(RETRY);
			return;
		}
		
		info = getStrBetween(doc, "<h1><b>", '</b></h1>', null);//<h1><b>农场 等级 3</b></h1>
		postMessage("升级 "+ this.buildingId +" 号建筑: "+ info);
	},
	buildAction2:	function(doc) 
	{
		if (doc.indexOf("建造中") < 0) 
		{
			postMessage("未打开 建造成功 页面");
		}
		this.doc = doc;//returns doc to BuildVillageAction
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******