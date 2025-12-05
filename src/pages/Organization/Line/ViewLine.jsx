import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, notification, Grid, List, Avatar, Dropdown, Menu, Modal, Collapse, Badge,Divider,Skeleton } from "antd";
import Table from "../../../components/Common/Table";
import { GET, DELETE, POST } from "helpers/api_helper";
import { LINE, COLUMNCHANGE, SELECTEDCOLUMN } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import SwipeablePanel from "components/Common/SwipeablePanel";
import { EllipsisOutlined, SearchOutlined, ReloadOutlined, PlusOutlined} from "@ant-design/icons";
import LineCollapseContent from "components/Common/LineCollapseContent";
import { Switch, FloatButton } from "antd";
import reorderIcon from "../../../assets/icons/up-and-down-arrow.png";
import lineIcon from '../../../assets/icons/residential-area.png'
import InfiniteScroll from "react-infinite-scroll-component";
import branchIcon from "../../../assets/images/location.png"
import "./ViewLine.css";

let header = [
  {
    label: "S.No",
    value: "index",
  },
  {
    label: "Branch Name",
    value: "branch_name",
    sort: true,
    filter: true,
    filterSearch: true,
  },
  {
    label: "Line Name",
    value: "lineName",
    sort: true,
    filter: true,
    filterSearch: true,
  },
  {
    label: "Line Type",
    value: "lineType",
    sort: true,
    filter: true,
    filterSearch: true,
  },
  { label: "No of Installment", value: "installment", sort: true },
  { label: "Bad Loan Installment", value: "badinstallment", sort: true },
  { label: "Actions", value: "actions" },
];

const ViewLine = () => {
  const navigate = useNavigate();
  const [reOrder, setReorder] = useState(false);
  const [rowReorderred, setRowReorderred] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [order, setOrder] = useState({});
  const [tableHeader, setTableHeader] = useState(header);
  const [tableLoader, setTableLoader] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteLoader, setDeleteLoader] = useState(false);
  const [reorderLoader, setReorderLoader] = useState(false);
  const [filterOption, setFilterOption] = useState({
    lineType: [
      { text: "Daily", value: "daily" },
      { text: "Weekly", value: "weekly" },
      { text: "Monthly", value: "monthly" },
    ],
  });
  const [selectedColumn, setSelectedColumn] = useState([]);
  const [isDragMode, setIsDragMode] = useState(false);
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchOptions, setBranchOptions] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState([]);
  const [expandedLines, setExpandedLines] = useState({});
  const [openSwipeId, setOpenSwipeId] = useState(null);

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const BRANCH_PAGE_SIZE = 10;
  const [visibleBranchCount, setVisibleBranchCount] = useState(BRANCH_PAGE_SIZE);

  const branchList = Object.keys(groupedData);
  const visibleBranches = branchList.slice(0, visibleBranchCount);
  const [selectedBranchFromStorage, setSelectedBranchFromStorage] = useState(null);
  const [linesPagination, setLinesPagination] = useState({});
  const LINES_PAGE_SIZE = 10;

  useEffect(() => {
    const storedBranchName = localStorage.getItem("selected_branch_name");
    const accessToken = localStorage.getItem("access_token");

    setSelectedBranchFromStorage(storedBranchName);

    if (storedBranchName) {
      getSelectedColumn();
    }

    if (storedBranchName && accessToken) {
      getLineList();
    } else {
      setTimeout(() => {
        const retryToken = localStorage.getItem("access_token");

        if (storedBranchName && retryToken) {
          getLineList();
        }
      }, 300);
    }
  }, []);

  const groupLinesByBranch = (data) => {
    const grouped = {};
    data.forEach((line) => {
      const branchName = line.branch_name || "Uncategorized";
      if (!grouped[branchName]) {
        grouped[branchName] = [];
      }
      grouped[branchName].push(line);
    });
    return grouped;
  };

  const sortData = (order) => {
    if (Object.keys(order).length > 0) {
      const reorderedData = [...tableData];
      Object.keys(order).forEach((value) => {
        const index = reorderedData.findIndex(
          (item) => item.id === parseInt(value)
        );
        if (index !== -1) {
          const [movedItem] = reorderedData.splice(index, 1);
          reorderedData.splice(order[value] - 1, 0, movedItem);
        }
      });
      return reorderedData;
    }
  };

  const handleReset = () => {
    const grouped = groupLinesByBranch(originalData);
    
    const newPagination = {};
    Object.keys(grouped).forEach(branchName => {
      newPagination[branchName] = {
        displayed: Math.min(LINES_PAGE_SIZE, grouped[branchName].length),
        total: grouped[branchName].length
      };
    });
    
    setTableData(originalData);
    setGroupedData(grouped);
    setLinesPagination(newPagination);
    
    setShowReset(false);
    setSelectedBranch(null);
    setSearchText("");
    
    notification.success({
      message: "Data Reset",
      description: "Restored to the original view successfully.",
    });
  };

  const SumbitReorder = async () => {
    try {
      setReorderLoader(true);
      const reorderedData =
        Object.keys(order)?.length > 0 ? sortData(order) : tableData;
      const response = await POST(`${LINE}reorder/`, reorderedData);
      if (response?.status === 200) {
        const storedBranchName = localStorage.getItem("selected_branch_name");
        
        const reorderedIds = new Set(reorderedData.map(item => item.id));
        
        const updatedOriginalData = [
          ...originalData.filter(item => !reorderedIds.has(item.id)),
          ...reorderedData
        ];
        
        let finalData = updatedOriginalData;
        if (storedBranchName) {
          finalData = updatedOriginalData.filter(
            (item) => item.branch_name === storedBranchName
          );
        }
        
        setOriginalData(updatedOriginalData);
        setTableData(finalData);
        const grouped = groupLinesByBranch(finalData);
        setGroupedData(grouped);
        
        const newPagination = {};
        Object.keys(grouped).forEach(branchName => {
          newPagination[branchName] = {
            displayed: Math.min(LINES_PAGE_SIZE, grouped[branchName].length),
            total: grouped[branchName].length
          };
        });
        setLinesPagination(newPagination);
        
        setReorder(false);
        setRowReorderred(false);
        const filtered = header.filter(
          (item) => !["move", "order"].includes(item.value)
        );
        setTableHeader(filtered);
        setOrder({});
        setSelectedBranch(null);
        setShowReset(false);
        setSearchText("");
        setIsDragMode(false);
        
        notification.success({
          message: "Re-Ordered",
          description: "The order has been updated successfully.",
          duration: 0,
        });
      } else {
        notification.error({
          message: "Re-Ordered",
          description: "Failed to update the order",
          duration: 0,
        });
      }
      setReorderLoader(false);
    } catch (e) {
      setReorderLoader(false);
      notification.error({
        message: "Error",
        description: "Failed to update the order",
      });
    }
  };

  const clickReorder = () => {
    const storedBranchName = localStorage.getItem("selected_branch_name");
    
    if (!storedBranchName) {
      notification.warning({
        message: "No Branch Selected",
        description: "Please select a branch from settings.",
      });
      return;
    }

    const filteredData = originalData.filter(
      (item) => item.branch_name === storedBranchName
    );

    if (filteredData.length === 0) {
      notification.warning({
        message: "No Lines Found",
        description: `No lines available for ${storedBranchName} branch.`,
      });
      return;
    }

    setShowReset(false);
    setSearchText("");

    setSelectedBranch(storedBranchName);
    setTableData(filteredData);
    
    setTableHeader((prev) => {
      return [
        { label: "Move", value: "move" },
        { label: "Order", value: "order" },
        ...prev,
      ];
    });
    
    setReorder(true);
  };

  const getLineList = async () => {
    try {
      setTableLoader(true);
      const response = await GET(LINE);
      if (response?.status === 200) {
        const storedBranchName = localStorage.getItem("selected_branch_name");
        
        let filteredData = response.data;
        if (storedBranchName) {
          filteredData = response.data.filter(
            (item) => item.branch_name === storedBranchName
          );
        }
        
        setTableData(filteredData);
        setOriginalData(filteredData);
        const grouped = groupLinesByBranch(filteredData);
        setGroupedData(grouped);

        Object.keys(grouped).forEach(branchName => {
          initializeBranchPagination(branchName, grouped[branchName].length);
        });

        const filterCol = ["branch_name", "lineName"];
        const uniqueOptions = {};
        filterCol.forEach((col) => {
          uniqueOptions[col] = new Set();
        });

        filteredData.forEach((item) => {
          filterCol.forEach((col) => {
            uniqueOptions[col].add(item[col]);
          });
        });

        filterCol.forEach((col) => {
          setFilterOption((prev) => ({
            ...prev,
            [col]: Array.from(uniqueOptions[col]).map((value) => ({
              text: value,
              value: value,
            })),
          }));
        });

        const uniqueBranches = [
          ...new Set(filteredData.map((item) => item.branch_name)),
        ];
        setBranchOptions(uniqueBranches.map((b) => ({ label: b, value: b })));
        
        if (storedBranchName) {
          setExpandedBranches([storedBranchName]);
        }
      } else {
        setTableData([]);
        setOriginalData([]);
        setGroupedData({});
      }
    } catch (error) {
      setTableData([]);
      setOriginalData([]);
      setGroupedData({});
    } finally {
      setTableLoader(false);
    }
  };

  const initializeBranchPagination = (branchName, totalLines) => {
    setLinesPagination(prev => ({
      ...prev,
      [branchName]: {
        displayed: Math.min(LINES_PAGE_SIZE, totalLines),
        total: totalLines
      }
    }));
  };

  const loadMoreLines = (branchName) => {
    setLinesPagination(prev => {
      const current = prev[branchName] || { displayed: 0, total: 0 };
      return {
        ...prev,
        [branchName]: {
          ...current,
          displayed: Math.min(current.displayed + LINES_PAGE_SIZE, current.total)
        }
      };
    });
  };

  const handleReOrder = (event, row) => {
    event.preventDefault();
    setRowReorderred(true);
    setOrder((prev) => ({ ...prev, [row.id]: event.target.value }));
  };

  const handleDragEnd = (data) => {
    setTableData(data);
    setRowReorderred(true);
  };

  const handleCancel = () => {
    const filtered = header.filter(
      (item) => !["move", "order"].includes(item.value)
    );
    setIsDragMode(false);
    setTableHeader(filtered);
    setReorder(false);
    setSelectedBranch(null);
    
    const storedBranchName = localStorage.getItem("selected_branch_name");
    if (storedBranchName) {
      const filteredData = originalData.filter(
        (item) => item.branch_name === storedBranchName
      );
      setTableData(filteredData);
      const grouped = groupLinesByBranch(filteredData);
      setGroupedData(grouped);
      
      Object.keys(grouped).forEach(branchName => {
        initializeBranchPagination(branchName, grouped[branchName].length);
      });
    } else {
      setTableData(originalData);
      setGroupedData(groupLinesByBranch(originalData));
    }
    
    setSearchText("");
    setShowReset(false);
  };

  const onDelete = async (record) => {
    try {
      setDeleteLoader(true);
      const response = await DELETE(`${LINE}${record.id}/`);
      if (response?.status === 200) {
        const updatedData = tableData.filter((item) => item.id !== record.id);
        setTableData(updatedData);
        setGroupedData(groupLinesByBranch(updatedData));
        notification.success({
          message: `${record?.lineName.toUpperCase()} Line Deleted!`,
          description: "The line has been deleted successfully",
          duration: 0,
        });
      } else {
        notification.error({
          message: "Line Delete",
          description: "The line is not deleted",
          duration: 0,
        });
      }
      setDeleteLoader(false);
      setShowConfirm(false);
    } catch (error) {
      setDeleteLoader(false);
      setShowConfirm(false);
      notification.error({
        message: "Line Deleted",
        description: "The line is not deleted",
        duration: 0,
      });
    }
  };

  const handleColumnChange = async (value) => {
    try {
      const res = await POST(COLUMNCHANGE, {
        entity: "line",
        columns: value,
      });
      setSelectedColumn(value);
      if (res.status === 200) {
        getLineList();
      }
    } catch (error) {
      throw error;
    }
  };

  const getSelectedColumn = async () => {
    try {
      const res = await GET(SELECTEDCOLUMN);
      if (res.status === 200) {
        setSelectedColumn(res?.data?.line || []);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleLineAction = (branchName, lineId) => {
    const key = `${branchName}-${lineId}`;
    setOpenSwipeId(null);
    setExpandedLines((prev) => {
      const newState = {
        [key]: !prev[key]
      };
      
      if (newState[key]) {
        setTimeout(() => {
          const element = document.getElementById(`line-item-${lineId}`);
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }
        }, 100);
      }
      
      return newState;
    });
  };

  const handleSwipeStateChange = (lineId, isOpen) => {
    if (isOpen) {
      setOpenSwipeId(lineId);
    } else if (openSwipeId === lineId) {
      setOpenSwipeId(null);
    }
  };

  const handleSearch = () => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      setTableData(originalData);
      const grouped = groupLinesByBranch(originalData);
      setGroupedData(grouped);
      
      Object.keys(grouped).forEach(branchName => {
        initializeBranchPagination(branchName, grouped[branchName].length);
      });
      
      setSearchModalVisible(false);
      setShowReset(false);
      notification.info({
        message: "Reset Search",
        description: "Showing all lines again.",
      });
      return;
    }

    const filtered = originalData.filter((item) => {
      const lineName = (item.lineName || "").toLowerCase();
      const lineType = (item.lineType || "").toLowerCase();

      return lineName.includes(query) || lineType.includes(query);
    });

    setTableData(filtered);
    const grouped = groupLinesByBranch(filtered);
    setGroupedData(grouped);
    
    Object.keys(grouped).forEach(branchName => {
      initializeBranchPagination(branchName, grouped[branchName].length);
    });
    
    setSearchModalVisible(false);
    setShowReset(true);

    if (filtered.length === 0) {
      notification.warning({
        message: "No Results",
        description: `No matches found for "${searchText}".`,
      });
    } else {
      notification.success({
        message: "Search Complete",
        description: `${filtered.length} result(s) found for "${searchText}".`,
      });
    }
  };

  const searchModal = (
    <Modal
      title={<div className="view-line-modal-title">Search Line</div>}
      open={searchModalVisible}
      onOk={handleSearch}
      onCancel={() => setSearchModalVisible(false)}
      okText="Search"
    >
      <p className="view-line-modal-label">Line Name</p>
      <input
        type="text"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Enter line name to search"
        className="view-line-search-input"
      />
    </Modal>
  );

  const handleEditLine = (line) => navigate(`/line/edit/${line.id}`);

  return (
    <div className="view-line-page-content">
      <div className="view-line-header">
        {reOrder && !branchModalVisible ? (
          <div>
            <h2 className="view-line-title">
              Reorder Lines
            </h2>
            <div className="view-line-reorder-info">
              Selected Branch: <span className="view-line-branch-name">{selectedBranch}</span>
            </div>
          </div>
        ) : (
          <h2 className="view-line-title">Line List</h2>
        )}

        <div className="view-line-actions">
          {reOrder && !branchModalVisible ? (
            <>
              <span className="view-line-switch-label">Slide</span>
              <Switch
                checked={isDragMode}
                onChange={(checked) => setIsDragMode(checked)}
              />
            </>
          ) : (
            <>
              <Button
                onClick={clickReorder}
                disabled={reOrder}
                className="view-line-reorder-button"
              >
                <img
                  src={reorderIcon}
                  alt="Reorder Icon"
                  className="view-line-reorder-icon"
                />
              </Button>
              {showReset && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  title="Reset to Original"
                />
              )}
              <Button
                icon={<SearchOutlined />}
                onClick={() => setSearchModalVisible(true)}
                type="default"
              >
                {!isMobile && "Search"}
              </Button>
            </>
          )}
        </div>
      </div>
      {searchModal}

      {tableLoader && <Loader />}

      {reOrder && !branchModalVisible ? (
        <div>
          <Table
            data={tableData}
            reOrder={isDragMode}
            Header={
              isDragMode
                ? [
                    { label: "S.No", value: "index" },
                    { label: "Line Name", value: "lineName" },
                    { label: "Move", value: "move" },
                  ]
                : [
                    { label: "S.No", value: "index" },
                    { label: "Reorder", value: "order" },
                    { label: "Line Name", value: "lineName" },
                  ]
            }
            filterOption={filterOption}
            handleDragEnd={isDragMode ? handleDragEnd : undefined}
            handleReOrder={!isDragMode ? handleReOrder : undefined}
            deleteLoader={deleteLoader}
            setShowConfirm={setShowConfirm}
            showConfirm={showConfirm}
            name="line"
          />

          <div className="view-line-table-actions">
            <Button
              type="primary"
              
              onClick={SumbitReorder}
              loading={reorderLoader}
              disabled={reorderLoader}
            >
              Submit
            </Button>
            <Button onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div
          id="scrollableDiv"
          className="view-line-scrollable-div"
        >
          {showReset && searchText && (
            <div className="view-line-search-results">
              <span className="view-line-search-label">
                Search Results:{" "}
                <span className="view-line-search-query">
                  "{searchText}"
                </span>
              </span>
              <span className="view-line-results-count">
                ({Object.values(groupedData).flat().length} results)
              </span>
            </div>
          )}

          {Object.keys(groupedData).map((branchName) => {
            return (
              <div
                key={branchName}
                className="view-line-branch-group"
              >
                <div className="view-line-branch-header">
                  <div className="view-line-branch-title-container">
                    <Avatar src={branchIcon}>
                      {branchName?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <span className="view-line-branch-title">
                      {branchName}
                    </span>
                  </div>
                  <Badge
                    count={groupedData[branchName].length}
                    className={showReset ? "view-line-badge-search" : "view-line-badge"}
                  />
                </div>
                
                <div 
                  id={'scrollableDiv-' + branchName}
                  className="view-line-list-container"
                >
                  <InfiniteScroll
                    dataLength={linesPagination[branchName]?.displayed || LINES_PAGE_SIZE}
                    next={() => loadMoreLines(branchName)}
                    hasMore={
                      (linesPagination[branchName]?.displayed || 0) < 
                      (linesPagination[branchName]?.total || 0)
                    }
                    loader={
                      <div className="view-line-skeleton">
                        <Skeleton avatar paragraph={{ rows: 1 }} active />
                      </div>
                    }
                    endMessage={
                      <Divider plain className="view-line-divider">
                        <span className="view-line-divider-star">★ </span>
                        <span className="view-line-divider-text">
                          End of{" "}
                          <span className="view-line-divider-branch-name">
                            {branchName}
                          </span> branch
                          <span className="view-line-divider-star"> ★</span>
                        </span>
                      </Divider>
                    }
                    scrollableTarget={'scrollableDiv-' + branchName}
                  >
                    <List
                      dataSource={
                        groupedData[branchName].slice(
                          0, 
                          linesPagination[branchName]?.displayed || LINES_PAGE_SIZE
                        )
                      }
                      className="view-line-list"
                      renderItem={(line) => {
                        const isExpanded = expandedLines[branchName + '-' + line.id];

                        return (
                          <div
                            key={line.id}
                            id={'line-item-' + line.id}
                            className="view-line-item-wrapper"
                          >
                            {isMobile ? (
                              <SwipeablePanel
                                item={line}
                                index={line.id}
                                titleKey="lineName"
                                name="line"
                                avatarSrc={lineIcon}
                                onSwipeRight={!isExpanded ? () => handleEditLine(line) : undefined}
                                onSwipeLeft={!isExpanded ? () => onDelete(line) : undefined}
                                isExpanded={isExpanded}
                                onExpandToggle={() => handleLineAction(branchName, line.id)}
                                renderContent={() => (
                                  isExpanded ? (
                                    <LineCollapseContent line={line} />
                                  ) : null
                                )}
                                isSwipeOpen={openSwipeId === line.id}
                                onSwipeStateChange={(isOpen) => handleSwipeStateChange(line.id, isOpen)}
                              />
                            ) : (
                              <>
                                <List.Item
                                  className={isExpanded ? "view-line-item view-line-item-expanded" : "view-line-item"}
                                >
                                  <List.Item.Meta
                                    avatar={
                                      <div className="view-line-avatar-container">
                                        <img
                                          src={lineIcon}
                                          alt="line-icon"
                                          className="view-line-avatar-icon"
                                        />
                                      </div>
                                    }
                                    title={
                                      <div
                                        onClick={() => handleLineAction(branchName, line.id)}
                                        className="view-line-item-title-container"
                                      >
                                        <span className="view-line-item-title">
                                          {line.lineName}
                                        </span>
                                        <Dropdown
                                          overlay={
                                            <Menu>
                                              <Menu.Item 
                                                key="edit"
                                                onClick={(e) => {
                                                  e.domEvent.stopPropagation();
                                                  handleEditLine(line);
                                                }}
                                              >
                                                Edit
                                              </Menu.Item>
                                              <Menu.Item 
                                                key="delete"
                                                danger 
                                                onClick={(e) => {
                                                  e.domEvent.stopPropagation();
                                                  onDelete(line);
                                                }}
                                              >
                                                Delete
                                              </Menu.Item>
                                            </Menu>
                                          }
                                          trigger={["click"]}
                                        >
                                          <EllipsisOutlined
                                            className="view-line-ellipsis-icon"
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </Dropdown>
                                      </div>
                                    }
                                  />
                                </List.Item>

                                {isExpanded && (
                                  <div className="view-line-collapse-content">
                                    <LineCollapseContent line={line} />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      }}
                    />
                  </InfiniteScroll>
                </div>
              </div>
            );
          })}

          {Object.keys(groupedData).length === 0 && !tableLoader && (
            <div className="view-line-no-data">
              <p>No lines found {showReset && searchText ? 'for "' + searchText + '"' : "for the selected branch"}</p>
            </div>
          )}
        </div>
      )}

      {!reOrder && (
        <FloatButton
          icon={<PlusOutlined />}
          type="primary"
          tooltip={<div>Add New Line</div>}
          onClick={() => navigate("/line/add")}
          className="view-line-float-button"
        />
      )}
    </div>
  );
};

export default ViewLine;