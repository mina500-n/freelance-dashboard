// script.js
// Global variables
let usersData = [];
let postsData = [];
let commentsData = [];
let isEditingPost = false;
let currentPostId = null;

// Loader and Toastr setup
const loader = $('#loader');
toastr.options = {
    "positionClass": "toast-bottom-right",
    "closeButton": true,
    "progressBar": true
};

// Dark/Light Mode
const modeToggleBtn = $('#mode-toggle');
const modeIcon = $('#mode-icon');
const body = $('body');

modeToggleBtn.on('click', () => {
    body.toggleClass('dark-mode');
    const isDarkMode = body.hasClass('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    modeIcon.text(isDarkMode ? '☀️' : '🌙');
});

if (localStorage.getItem('darkMode') === 'true') {
    body.addClass('dark-mode');
    modeIcon.text('☀️');
}

// Tab switching logic
$('.tab-menu button').on('click', function() {
    $('.tab-menu button').removeClass('active');
    $(this).addClass('active');
    $('.content-section').hide();
    const targetId = $(this).attr('id').replace('-tab', '-section');
    $(`#${targetId}`).show();
});

// Custom confirmation modal
function showConfirmation(message, callback) {
    $('#confirmation-message').text(message);
    $('#confirmation-modal').css('display', 'flex');
    $('#confirm-yes-btn').off('click').on('click', () => {
        callback(true);
        $('#confirmation-modal').hide();
    });
    $('#confirm-no-btn').off('click').on('click', () => {
        callback(false);
        $('#confirmation-modal').hide();
    });
}

// Helper function to show/hide loader
function showLoader() {
    loader.show();
}
function hideLoader() {
    loader.hide();
}

// --- Main Fetching Logic ---
async function fetchData() {
    showLoader();
    try {
        const [usersRes, postsRes, commentsRes] = await Promise.all([
            fetch('https://jsonplaceholder.typicode.com/users'),
            fetch('https://jsonplaceholder.typicode.com/posts'),
            fetch('https://jsonplaceholder.typicode.com/comments')
        ]);

        usersData = await usersRes.json();
        postsData = await postsRes.json();
        commentsData = await commentsRes.json();

        // Render all sections after data is fetched
        renderDashboardStats();
        renderUsersTable();
        renderPosts();

        toastr.success('Data loaded successfully!');
    } catch (error) {
        toastr.error('Failed to load data.');
        console.error('Error fetching data:', error);
    } finally {
        hideLoader();
    }
}

// --- Dashboard Section ---
function renderDashboardStats() {
    $('#users-count').text(usersData.length);
    $('#posts-count').text(postsData.length);
    $('#comments-count').text(commentsData.length);
}

// --- Users Section ---
let usersTable;
const favorites = JSON.parse(localStorage.getItem('favorites')) || [];

function renderUsersTable() {
    if ($.fn.DataTable.isDataTable('#users-table')) {
        usersTable.destroy();
    }

    const tableBody = $('#users-table tbody');
    tableBody.empty();
    usersData.forEach(user => {
        const isFavorite = favorites.includes(user.id);
        const favClass = isFavorite ? 'active' : '';
        const row = `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.address.city}</td>
                <td>
                    <button class="btn edit-user" data-id="${user.id}">Edit</button>
                    <button class="btn delete-user" data-id="${user.id}">Delete</button>
                </td>
                <td>
                    <button class="btn favorite-user ${favClass}" data-id="${user.id}">
                        ${isFavorite ? '⭐' : '☆'}
                    </button>
                </td>
            </tr>
        `;
        tableBody.append(row);
    });

    usersTable = $('#users-table').DataTable({
        "language": {
            "lengthMenu": "Show _MENU_ entries",
            "search": "Search:",
            "paginate": {
                "first": "First",
                "last": "Last",
                "next": "Next",
                "previous": "Previous"
            }
        }
    });
}

// Users table actions
$(document).on('click', '.edit-user', function() {
    const userId = $(this).data('id');
    const user = usersData.find(u => u.id === userId);
    $('#modal-title').text('Edit User');
    $('#user-id-input').val(user.id);
    $('#user-name-input').val(user.name);
    $('#user-email-input').val(user.email);
    $('#user-modal').css('display', 'flex');
});

$(document).on('click', '.delete-user', function() {
    const userId = $(this).data('id');
    showConfirmation('Are you sure you want to delete this user?', (result) => {
        if (result) {
            usersData = usersData.filter(u => u.id !== userId);
            toastr.info('User deleted successfully (locally).');
            renderUsersTable();
        }
    });
});

$(document).on('click', '.favorite-user', function() {
    const userId = $(this).data('id');
    const index = favorites.indexOf(userId);
    if (index > -1) {
        favorites.splice(index, 1);
        $(this).removeClass('active').html('☆');
        toastr.warning('User removed from favorites.');
    } else {
        favorites.push(userId);
        $(this).addClass('active').html('⭐');
        toastr.success('User added to favorites!');
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
});

$('#user-form').on('submit', function(e) {
    e.preventDefault();
    const userId = parseInt($('#user-id-input').val());
    const newName = $('#user-name-input').val();
    const newEmail = $('#user-email-input').val();
    const userIndex = usersData.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        usersData[userIndex].name = newName;
        usersData[userIndex].email = newEmail;
        toastr.success('User data updated successfully.');
        renderUsersTable();
        $('#user-modal').hide();
    }
});

// --- Posts Section ---
function renderPosts(filteredPosts = postsData) {
    const postsContainer = $('#posts-container');
    postsContainer.empty();
    filteredPosts.forEach(post => {
        const postHtml = `
            <div class="post-card animate__animated animate__fadeInUp" data-id="${post.id}">
                <h3>${post.title}</h3>
                <p>${post.body.substring(0, 100)}...</p>
                <div class="post-actions">
                    <button class="btn view-comments" data-id="${post.id}">View Comments</button>
                    <button class="btn edit-post" data-id="${post.id}">Edit</button>
                    <button class="btn delete-post" data-id="${post.id}">Delete</button>
                </div>
            </div>
        `;
        postsContainer.append(postHtml);
    });
}

// Post search
$('#post-search').on('input', function() {
    const searchText = $(this).val().toLowerCase();
    const filteredPosts = postsData.filter(post =>
        post.title.toLowerCase().includes(searchText) || post.body.toLowerCase().includes(searchText)
    );
    renderPosts(filteredPosts);
});

// Add Post button
$('#add-post-btn').on('click', function() {
    isEditingPost = false;
    $('#post-modal-title').text('Add New Post');
    $('#post-form')[0].reset();
    $('#post-modal').css('display', 'flex');
});

// Post actions
$(document).on('click', '.edit-post', function() {
    isEditingPost = true;
    const postId = $(this).data('id');
    const post = postsData.find(p => p.id === postId);
    if (post) {
        currentPostId = postId;
        $('#post-modal-title').text('Edit Post');
        $('#post-id-input').val(post.id);
        $('#post-title-input').val(post.title);
        $('#post-body-input').val(post.body);
        $('#post-modal').css('display', 'flex');
    }
});

$(document).on('click', '.delete-post', function() {
    const postId = $(this).data('id');
    showConfirmation('Are you sure you want to delete this post?', (result) => {
        if (result) {
            postsData = postsData.filter(p => p.id !== postId);
            toastr.info('Post deleted successfully (locally).');
            renderPosts();
        }
    });
});

$('#post-form').on('submit', function(e) {
    e.preventDefault();
    const title = $('#post-title-input').val();
    const body = $('#post-body-input').val();

    if (isEditingPost) {
        const postIndex = postsData.findIndex(p => p.id === currentPostId);
        if (postIndex !== -1) {
            postsData[postIndex].title = title;
            postsData[postIndex].body = body;
            toastr.success('Post updated successfully.');
        }
    } else {
        const newPost = {
            id: postsData.length + 1,
            title: title,
            body: body,
            userId: 1 // For example
        };
        postsData.unshift(newPost); // Add to the beginning
        toastr.success('New post added successfully.');
    }

    renderPosts();
    $('#post-modal').hide();
});

// View Comments
$(document).on('click', '.view-comments', async function() {
    const postId = $(this).data('id');
    const commentsContainer = $('#comments-container');
    commentsContainer.empty().html('<div class="loader" style="display:block;"></div>');

    try {
        const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${postId}/comments`);
        const postComments = await res.json();
        commentsContainer.empty();
        if (postComments.length > 0) {
            postComments.forEach(comment => {
                commentsContainer.append(`
                    <div style="background:var(--light-bg); padding:10px; border-radius:8px; margin-bottom:10px; border:1px solid var(--light-border);">
                        <p style="font-weight:bold; color:var(--light-primary);">${comment.email}</p>
                        <p>${comment.body}</p>
                    </div>
                `);
            });
        } else {
            commentsContainer.html('<p>No comments for this post.</p>');
        }
        $('#comments-modal').css('display', 'flex');
    } catch (error) {
        toastr.error('Failed to load comments.');
        commentsContainer.empty().html('<p>An error occurred while loading comments.</p>');
        console.error('Error fetching comments:', error);
    }
});

// Close modals
$('.modal .close-btn').on('click', function() {
    $(this).closest('.modal').hide();
});

$(window).on('click', function(e) {
    if ($(e.target).hasClass('modal')) {
        $(e.target).hide();
    }
});

// Initial data load
$(document).ready(() => {
    fetchData();
});
