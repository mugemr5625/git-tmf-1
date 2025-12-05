/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
import { Button, notification, FloatButton, Form, Input, Modal, Avatar, List, Skeleton, Divider, Menu, Dropdown, Popconfirm, Tag } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined, ExclamationCircleOutlined, DeleteFilled, EllipsisOutlined } from "@ant-design/icons";
import { GET_BRANCHES, DELETE, GET } from "helpers/api_helper";
import { ADD_BRANCH } from "helpers/url_helper";
import Loader from "components/Common/Loader";
import BranchCollapseContent from "components/Common/BranchCollapseContent";
import "./ListBranch.css";
import InfiniteScroll from "react-infinite-scroll-component";
import { useNavigate } from "react-router-dom";
import branchIcon from "assets/images/location.png";
import SwipeablePanel from "components/Common/SwipeablePanel";
import BranchNameModal from "components/Common/BranchNameModal";

const ListBranch = () => {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [deleteLoader, setDeleteLoader] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [branchDetails, setBranchDetails] = useState({});
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [form] = Form.useForm();
  const [searchTerm, setSearchTerm] = useState("");
  const [displayedBranches, setDisplayedBranches] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const navigate = useNavigate();
  
  const itemsPerPage = 10;
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [selectedBranchName, setSelectedBranchName] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedBranch = localStorage.getItem("selected_branch_name");
    if (savedBranch) {
      setSelectedBranchName(savedBranch);
      setIsInitialized(true);
    } else {
      const checkToken = () => {
        const token = localStorage.getItem("access_token");
        if (token) {
          setIsInitialized(true);
          setBranchModalVisible(true);
        } else {
          setTimeout(checkToken, 300);
        }
      };
      checkToken();
    }
  }, []);

  const handleSaveBranchName = (name) => {
    localStorage.setItem("selected_branch_name", name);
    setSelectedBranchName(name);
    setBranchModalVisible(false);
    window.location.reload();
  };

  const handleCancelBranchModal = () => {
    notification.warning({
      message: "Branch Name Required",
      description: "Please select a branch name to continue",
    });
  };

  const onDelete = async (record) => {
    try {
      setDeleteLoader(true);
      const response = await DELETE(`${ADD_BRANCH}${record.id}`);

      if (response?.status === 200) {
        setBranches((prev) => prev.filter((item) => item.id !== record.id));
        notification.success({
          message: `${record.branch_name?.toUpperCase()} Branch Deleted!`,
          description: "The branch has been deleted successfully.",
          duration: 2,
        });
      } else {
        notification.error({
          message: "Delete Failed",
          description: "The branch could not be deleted.",
        });
      }
    } catch (error) {
      console.error("Error deleting branch:", error);
      notification.error({
        message: "Error",
        description: "An error occurred while deleting the branch.",
      });
    } finally {
      setDeleteLoader(false);
      setShowConfirm(false);
      setOpenSwipeId(null);
    }
  };

  // Fetch branch details automatically for displayed branches
  const fetchBranchDetails = useCallback(async (branchId) => {
    setBranchDetails((prev) => {
      // Check if already exists to avoid unnecessary API calls
      if (prev[branchId]) {
        return prev;
      }
      
      // Fetch in background
      (async () => {
        try {
          const response = await GET(`/api/branch/${branchId}/`);
          if (response?.status === 200) {
            setBranchDetails((current) => ({
              ...current,
              [branchId]: response.data,
            }));
          }
        } catch (error) {
          console.error("Error fetching branch details:", error);
        }
      })();
      
      return prev;
    });
  }, []);

  const getBranchesList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await GET_BRANCHES(ADD_BRANCH);
      if (response?.status === 200) {
        const allBranches = response.data;
        setBranches(allBranches);
        
        // Filter branches based on selected branch name
        const savedBranchName = localStorage.getItem("selected_branch_name");
        if (savedBranchName) {
          const filtered = allBranches.filter(
            (branch) => branch.branch_name === savedBranchName
          );
          setDisplayedBranches(filtered.slice(0, 10));
          setHasMore(filtered.length > 10);
          
          // Fetch details for initially displayed branches
          filtered.slice(0, 10).forEach(branch => {
            fetchBranchDetails(branch.id);
          });
        } else {
          setDisplayedBranches(allBranches.slice(0, 10));
          setHasMore(allBranches.length > 10);
          
          // Fetch details for initially displayed branches
          allBranches.slice(0, 10).forEach(branch => {
            fetchBranchDetails(branch.id);
          });
        }
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchBranchDetails]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      getBranchesList();
    } else {
      setTimeout(() => {
        const retryToken = localStorage.getItem("access_token");
        if (retryToken) {
          getBranchesList();
        }
      }, 300);
    }
  }, [getBranchesList]);

  const showSearchModal = () => setSearchModalVisible(true);
  const handleCancel = () => setSearchModalVisible(false);
  
  const handleSearch = () => {
    const { branchName } = form.getFieldsValue();
    if (!branchName) {
      notification.warning({
        message: "No Input",
        description: "Please enter a branch name to search.",
      });
      return;
    }

    const searchValue = branchName.toLowerCase().trim();
    setSearchTerm(searchValue);

    // Filter from already filtered branches (selected branch only)
    const savedBranchName = localStorage.getItem("selected_branch_name");
    const baseFiltered = savedBranchName 
      ? branches.filter(b => b.branch_name === savedBranchName)
      : branches;

    const filtered = baseFiltered.filter(
      (b) => b.branch_name?.toLowerCase().includes(searchValue)
    );

    if (filtered.length === 0) {
      notification.warning({
        message: "No Results",
        description: "No branches found matching your search.",
      });
    }

    setDisplayedBranches(filtered.slice(0, 10));
    setHasMore(filtered.length > 10);
    
    // Fetch details for search results
    filtered.slice(0, 10).forEach(branch => {
      fetchBranchDetails(branch.id);
    });
    
    setSearchModalVisible(false);
  };

  const handleReset = () => {
    form.resetFields();
    setSearchTerm("");
    
    // Reset to show only selected branch
    const savedBranchName = localStorage.getItem("selected_branch_name");
    if (savedBranchName) {
      const filtered = branches.filter(
        (branch) => branch.branch_name === savedBranchName
      );
      setDisplayedBranches(filtered.slice(0, itemsPerPage));
      setHasMore(filtered.length > itemsPerPage);
      
      // Fetch details for reset branches
      filtered.slice(0, itemsPerPage).forEach(branch => {
        fetchBranchDetails(branch.id);
      });
    } else {
      setDisplayedBranches(branches.slice(0, itemsPerPage));
      setHasMore(branches.length > itemsPerPage);
      
      // Fetch details for reset branches
      branches.slice(0, itemsPerPage).forEach(branch => {
        fetchBranchDetails(branch.id);
      });
    }
    setOpenSwipeId(null);
  };

  const handleSwipeStateChange = (branchId, isOpen) => {
    if (isOpen) {
      setOpenSwipeId(branchId);
    } else if (openSwipeId === branchId) {
      setOpenSwipeId(null);
    }
  };

  const renderMenu = (branch) => (
    <Menu>
      <Menu.Item
        key="edit"
        onClick={(e) => {
          e.domEvent.stopPropagation();
          navigate(`/branch/edit/${branch.id}`);
        }}
      >
        <div className="d-flex align-items-center gap-1">
          <span className="mdi mdi-pencil text-secondary mb-0"></span>
          <span>Edit</span>
        </div>
      </Menu.Item>

      <Menu.Item key="delete">
        <Popconfirm
          title={`Delete branch ${branch.branch_name}?`}
          description="Are you sure you want to delete?"
          icon={<ExclamationCircleOutlined style={{ color: "red" }} />}
          onConfirm={(e) => {
            e.stopPropagation();
            onDelete(branch);
          }}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true, type: "primary" }}
          cancelButtonProps={{ type: "default" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="d-flex align-items-center gap-1" style={{ color: "red" }}>
            <DeleteFilled style={{ color: "red" }} />
            <span>Delete</span>
          </div>
        </Popconfirm>
      </Menu.Item>
    </Menu>
  );

  useEffect(() => {
    if (branches.length > 0) {
      // Filter by selected branch name
      const savedBranchName = localStorage.getItem("selected_branch_name");
      if (savedBranchName) {
        const filtered = branches.filter(
          (branch) => branch.branch_name === savedBranchName
        );
        setDisplayedBranches(filtered.slice(0, itemsPerPage));
      } else {
        setDisplayedBranches(branches.slice(0, itemsPerPage));
      }
    }
  }, [branches]);

  const fetchMoreBranches = () => {
    const savedBranchName = localStorage.getItem("selected_branch_name");
    const baseFiltered = savedBranchName 
      ? branches.filter(b => b.branch_name === savedBranchName)
      : branches;

    const currentLength = displayedBranches.length;
    const nextLength = currentLength + itemsPerPage;
    
    if (nextLength >= baseFiltered.length) {
      setDisplayedBranches(baseFiltered);
      setHasMore(false);
      
      // Fetch details for remaining branches
      baseFiltered.slice(currentLength).forEach(branch => {
        fetchBranchDetails(branch.id);
      });
    } else {
      setDisplayedBranches(baseFiltered.slice(0, nextLength));
      
      // Fetch details for newly loaded branches
      baseFiltered.slice(currentLength, nextLength).forEach(branch => {
        fetchBranchDetails(branch.id);
      });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="list-branch-page-content">
      {loading && <Loader />}

      <div className="list-branch-header">
        <h2 className="list-branch-title">
          Branch List
        </h2>

        <div className="list-branch-actions">
          <Button
            icon={<SearchOutlined />}
            onClick={showSearchModal}
            className="search-button"
          >
            <span className="search-text">Search</span>
          </Button>

          {searchTerm && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              title="Reset Search"
            />
          )}
        </div>
      </div>

      {/* Display Selected Branch Name at Top */}
      {selectedBranchName && (
        <div style={{
          // padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px"
        }}>
          <span style={{ 
            fontWeight: "600", 
            fontSize: "15px",
          }}>
            Branch:
          </span>
          <Tag color="blue" style={{ 
            fontSize: "14px", 
            padding: "4px 12px",
            margin: 0
          }}>
            {selectedBranchName}
          </Tag>
        </div>
      )}

      <div
        id="scrollableDiv"
        className="list-branch-scrollable-div"
      >
        <InfiniteScroll
          dataLength={displayedBranches.length}
          className="list-branch-infinite-scroll"
          next={fetchMoreBranches}
          hasMore={hasMore}
          loader={<Skeleton avatar paragraph={{ rows: 1 }} active />}
          scrollableTarget="scrollableDiv"
        >
          {searchTerm && (
            <div className="list-branch-search-results">
              <span className="list-branch-search-label">
                Search Results:{" "}
                <span className="list-branch-search-query">
                  "{searchTerm}"
                </span>
              </span>
              <span className="list-branch-results-count">
                ({displayedBranches.length} result{displayedBranches.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}
          
          {displayedBranches.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#8c8c8c"
            }}>
              <p style={{ fontSize: "16px", marginBottom: "8px" }}>No branches found</p>
              <p style={{ fontSize: "14px" }}>Try adjusting your search or filters</p>
            </div>
          ) : (
            <List
              dataSource={displayedBranches}
              renderItem={(branch) => {
                const details = branchDetails[branch.id];

                const handleEditBranch = (branch) => {
                  setOpenSwipeId(null);
                  navigate(`/branch/edit/${branch.id}`);
                };

                const handleDeleteBranch = (branch) => {
                  setOpenSwipeId(null);
                  onDelete(branch);
                };

                return (
                  <div
                    key={branch.id}
                    className="list-branch-item-wrapper"
                  >
                    {isMobile ? (
                      <SwipeablePanel
                        item={branch}
                        index={branch.id}
                        titleKey="branch_name"
                        name="branch"
                        avatarSrc={branchIcon}
                        onSwipeRight={() => handleEditBranch(branch)}
                        onSwipeLeft={() => handleDeleteBranch(branch)}
                        isExpanded={true}
                        renderContent={() => (
                          <BranchCollapseContent branch={branch} details={details} />
                        )}
                        isSwipeOpen={openSwipeId === branch.id}
                        onSwipeStateChange={(isOpen) => handleSwipeStateChange(branch.id, isOpen)}
                      />
                    ) : (
                      <>
                        <List.Item
                          className="list-branch-item list-branch-item-expanded"
                        >
                          <List.Item.Meta
                            avatar={<Avatar src={branchIcon} />}
                            title={
                              <div className="list-branch-item-title-container">
                                <span className="list-branch-item-title">
                                  {branch.branch_name}
                                </span>
                                <Dropdown overlay={renderMenu(branch)} trigger={["click"]}>
                                  <EllipsisOutlined
                                    className="list-branch-ellipsis-icon"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </Dropdown>
                              </div>
                            }
                          />
                        </List.Item>

                        <div className="list-branch-collapse-content">
                          <BranchCollapseContent branch={branch} details={details} />
                        </div>
                      </>
                    )}
                  </div>
                );
              }}
            />
          )}
        </InfiniteScroll>
      </div>

      <Modal
        title={<div className="list-branch-modal-title">Search Branches</div>}
        open={searchModalVisible}
        onOk={handleSearch}
        onCancel={handleCancel}
        okText="Search"
        cancelText="Cancel"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Branch Name" name="branchName">
            <Input
              placeholder="Enter branch name to search"
              allowClear
              onChange={(e) => {
                const value = e.target.value.trim();
                if (value === "") {
                  setFilteredBranches([]);
                  getBranchesList();
                }
              }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <FloatButton
        icon={<PlusOutlined />}
        type="primary"
        className="list-branch-float-button"
        onClick={() => (window.location.href = "/branch/add")}
        tooltip="Add New Branch"
      />

      {isInitialized && (
        <BranchNameModal
          visible={branchModalVisible}
          onSave={handleSaveBranchName}
          onCancel={handleCancelBranchModal}
        />
      )}
    </div>
  );
};

export default ListBranch;