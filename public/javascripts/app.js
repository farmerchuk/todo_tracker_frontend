const TodoTracker = {
  $nav: $('#menu'),
  $todosGroupingsHeaders: $('#menu .grouping-header'),
  $todosGroupings: $('#menu .groupings'),
  $allTodosGroupings: $('#all-todos .groupings'),
  $allCompletedTodosGroupings: $('#completed-todos .groupings'),
  $todoList: $('#todo-list'),
  $addNewTodo: $('#add-new-todo'),
  $modalForm: $('#modal form'),
  $modalFormSave: $('#modal input[value="Save"]'),
  $modalFormMarkComplete: $('#modal input[name="mark-complete"]'),
  $overlay: $('#overlay'),

  handlebarsTemplates: {},

  monthsAsNumbers: {
    'January': '1', 'February': '2', 'March': '3', 'April': '4',
    'May': '5', 'June': '6', 'July': '7', 'August': '8',
    'September': '9', 'October': '10', 'November': '11', 'December': '12',
  },

  createHandlebarsTemplates() {
    this.createTemplates();
    this.registerPartials();
  },

  createTemplates() {
    const $handlebarsScripts = $('script[type="text/x-handlebars"]');

    $handlebarsScripts.each(this.createHandlebarTemplate.bind(this));
  },

  createHandlebarTemplate(idx, script) {
    const $script = $(script);
    const scriptId = $script.attr('id');

    this.handlebarsTemplates[scriptId] = Handlebars.compile($script.html());
  },

  registerPartials() {
    const $handlebarsScriptsPartials = $('script[type="text/x-handlebars"][class="partial"]');

    $handlebarsScriptsPartials.each(this.registerPartial.bind(this));
  },

  registerPartial(idx, script) {
    const $script = $(script);
    const scriptId = $script.attr('id');

    Handlebars.registerPartial(scriptId, $script.html());
  },

  bind() {
    this.$todoList.on('click', '.trash', this.deleteTodo.bind(this));
    this.$todoList.on('click', 'li', this.toggleTodoCompleted.bind(this));
    this.$todoList.on('click', 'p', this.showEditTodo.bind(this));
    this.$addNewTodo.on('click', this.showNewModal.bind(this));
    this.$overlay.on('click', this.hideModal.bind(this));
    this.$modalForm.on('click', 'input[name="new-todo"]', this.createTodo.bind(this));
    this.$modalForm.on('click', 'input[name="edit-todo"]', this.editTodo.bind(this));
    this.$modalFormMarkComplete.on('click', this.toggleTodoCompleted.bind(this));
    this.$todosGroupingsHeaders.on('click', this.refreshTodosPaneByGroupingHeader.bind(this));
    this.$todosGroupings.on('click', 'li', this.refreshTodosPaneByGrouping.bind(this));
    this.$nav.on('click', '.highlightable', this.highlight.bind(this));
  },

  showNavigationPane() {
    $.ajax({
      method: 'get',
      url: '/api/todos',
      dataType: 'json',
      success: json => {
        this.refreshNavigationGroupings(json);
      },
    });
  },

  showAllTodos() {
    $.ajax({
      method: 'get',
      url: '/api/todos',
      dataType: 'json',
      success: json => {
        this.refreshTodosPaneList(json);
        this.refreshTodosPaneHeaderCount(json.length)
        this.refreshTodosPaneHeaderTitle('All Todos');
      },
    });
  },

  showCompletedTodos() {
    $.ajax({
      method: 'get',
      url: '/api/todos',
      dataType: 'json',
      success: json => {
        const todos = json.filter(todo => todo.completed);

        this.refreshTodosPaneList(todos);
        this.refreshTodosPaneHeaderCount(todos.length)
        this.refreshTodosPaneHeaderTitle('Completed Todos');
      },
    });
  },

  showTodosByDate(e) {
    $.ajax({
      method: 'get',
      url: '/api/todos',
      dataType: 'json',
      success: json => {
        const todoData = this.getTodosByDate(e, json);

        this.refreshTodosPaneList(todoData.todos);
        this.refreshTodosPaneHeaderCount(todoData.todos.length)
        this.refreshTodosPaneHeaderTitle(todoData.listTitle);
      },
    });
  },

  refreshTodosPaneList(json) {
    let todosHtml;

    this.addFormattedTodoDate(json);
    json.sort(this.sortByCompleted);
    todosHtml = this.handlebarsTemplates.todosTemplate({todos: json});

    this.$todoList.html(todosHtml)
  },

  refreshTodosPaneHeaderCount(count) {
    $('#todos .grouping-header .count').html(count);
  },

  refreshTodosPaneHeaderTitle(title) {
    $('#todos h1').html(title);
  },

  refreshTodosPaneByGroupingHeader(e) {
    const groupingId = $(e.currentTarget).parent().attr('id');

    if (groupingId === 'all-todos') this.refreshTodosPaneBy('allTodos', e);
    if (groupingId === 'completed-todos') this.refreshTodosPaneBy('completedTodos', e);
  },

  refreshTodosPaneByGrouping(e) {
    this.refreshTodosPaneBy('date', e);
  },

  refreshTodosPaneBy(listType, e) {
    if (listType === 'allTodos') this.showAllTodos();
    if (listType === 'completedTodos') this.showCompletedTodos();
    if (listType === 'date') this.showTodosByDate(e);
  },

  refreshNavigationGroupings(json) {
    const currentSection = $('.active-grouping').closest('section').attr('id');
    const currentSelectionIsHeader = $('.active-grouping').closest('.highlightable').hasClass('grouping-header');
    const currentSelectionIndex = $('.active-grouping').index();

    this.refreshNavigationAllTodosGroupings(json, currentSelectionIndex, currentSelectionIsHeader, currentSection);
    this.refreshNavigationCompletedTodosGroupings(json, currentSelectionIndex, currentSelectionIsHeader, currentSection);
  },

  refreshNavigationAllTodosGroupings(json, currentSelectionIndex, currentSelectionIsHeader, currentSection) {
    const allTodosGroupedByDate = this.groupAllTodosByDate(json);
    const todosHtml = this.handlebarsTemplates.todosGroupingsTemplate({groupings: allTodosGroupedByDate});

    this.$allTodosGroupings.html(todosHtml);
    this.refreshNavigationTodosListHeaderCount($('#all-todos .grouping-header .count'), json.length);

    if (currentSection === 'all-todos') {
      if (currentSelectionIsHeader) {
        this.highlightTarget($('#all-todos').find('.grouping-header'));
      } else {
        this.highlightTarget($('#all-todos .groupings').children().eq(currentSelectionIndex));
      }
    }
  },

  refreshNavigationCompletedTodosGroupings(json, currentSelectionIndex, currentSelectionIsHeader, currentSection) {
    const todos = json.filter(todo => todo.completed);
    const allTodosGroupedByDate = this.groupAllTodosByDate(todos);
    const todosHtml = this.handlebarsTemplates.todosGroupingsTemplate({groupings: allTodosGroupedByDate});

    this.$allCompletedTodosGroupings.html(todosHtml);
    this.refreshNavigationTodosListHeaderCount($('#completed-todos .grouping-header .count'), todos.length);

    if (currentSection === 'completed-todos') {
      let completedGroupingCount = this.$allCompletedTodosGroupings.children().length;

      if (currentSelectionIsHeader) {
        this.highlightTarget($('#completed-todos').find('.grouping-header'));
      } else {
        if (completedGroupingCount === 0) {
          this.highlightTarget($('#completed-todos').find('.grouping-header'));
        } else {
          const $newSelection = $('#completed-todos .groupings').children().eq(currentSelectionIndex);

          if ($newSelection.get(0)) {
            this.highlightTarget($('#completed-todos .groupings').children().eq(currentSelectionIndex));
            $newSelection.trigger('click');
          } else {
            this.highlightTarget($('#completed-todos .groupings').children().eq(currentSelectionIndex - 1));
            $('#completed-todos .groupings').children().eq(currentSelectionIndex - 1).trigger('click');
          }
        }
      }
    }
  },

  refreshNavigationTodosListHeaderCount($headerCountElement, count) {
    $headerCountElement.html(count);
  },

  showNewModal() {
    this.$modalFormSave.attr('name', 'new-todo');
    this.showModal();
  },

  showModal() {
    this.$modalForm.fadeIn(200);
    this.$overlay.fadeIn(200);
  },

  hideModal() {
    this.$modalForm.fadeOut(200);
    this.$overlay.fadeOut(200, e => this.clearModalForm());
  },

  clearModalForm() {
    this.$modalForm.get(0).reset();
    this.$modalForm.find('textarea[name="description"]').html('');
  },

  createTodo(e) {
    e.preventDefault();

    const formData = this.$modalForm.serializeArray();
    const formattedData = this.formatFormDate(formData);
    const serializedFormData = $.param(formData);
    const formTitle = formData.find(input => input.name === 'title').value;

    if (formTitle.length < 3) {
      alert('Title must be at least 3 characters long.');
      return;
    }

    this.createTodoAjax(serializedFormData);
    this.highlightTarget($('#menu #all-todos .grouping-header'));
    this.clearModalForm();
    this.hideModal();
  },

  createTodoAjax(serializedFormData) {
    $.ajax({
      method: 'post',
      url: '/api/todos',
      data: serializedFormData,
      success: json => {
        this.showNavigationPane();
        this.showAllTodos();
      }
    });
  },

  toggleTodoCompleted(e) {
    e.preventDefault();

    if ($(e.currentTarget).prev().attr('name') === 'new-todo') {
      alert('You cannot mark a todo as complete before it has been created.');
      return;
    }

    let todoId;
    let $todo;

    if (e.currentTarget.name === 'mark-complete') {
      todoId = $(e.currentTarget).prev().attr('data-id');
      this.hideModal();
    } else {
      $todo = $(e.target).closest('.todo');
      todoId = $todo.attr('data-id');
    }

    this.toggleTodoCompletedAjax(todoId);
  },

  toggleTodoCompletedAjax(id) {
    $.ajax({
      method: 'post',
      url: '/api/todos/' + id + '/toggle_completed',
      success: json => {
        $('.active-grouping').trigger('click');
        this.showNavigationPane();
      },
    });
  },

  showEditTodo(e) {
    e.preventDefault();
    e.stopPropagation();

    const $todo = $(e.target).closest('.todo');
    const todoId = $todo.attr('data-id');

    this.populateFormByTodoId(todoId);
    this.$modalFormSave.attr('name', 'edit-todo');
    this.$modalFormSave.attr('data-id', todoId);
    this.showModal();
  },

  populateFormByTodoId(id) {
    $.ajax({
      method: 'get',
      url: '/api/todos/' + id,
      dataType: 'json',
      success: this.populateFormWithTodoData.bind(this),
    });
  },

  populateFormWithTodoData(json) {
    const formattedDay = this.removeLeadingZero(json.day);
    const monthNum = this.removeLeadingZero(json.month);
    const formattedMonth = this.convertNumToMonth(monthNum);

    this.$modalForm.find('input[name="title"]').val(json.title);
    this.$modalForm.find('select[name="day"]').val(formattedDay);
    this.$modalForm.find('select[name="month"]').val(formattedMonth);
    this.$modalForm.find('select[name="year"]').val(json.year);
    this.$modalForm.find('textarea[name="description"]').html(json.description);

    if (json.completed) {
      this.$modalFormMarkComplete.val('Mark Incomplete');
    } else {
      this.$modalFormMarkComplete.val('Mark As Complete');
    }
  },

  editTodo(e) {
    e.preventDefault();

    const todoId = this.$modalFormSave.attr('data-id');
    const formData = this.$modalForm.serializeArray();
    const formattedData = this.formatFormDate(formData);
    const serializedFormData = $.param(formData);

    this.updateTodoAjax(serializedFormData, todoId);
    this.clearModalForm();
    this.hideModal();
  },

  updateTodoAjax(serializedFormData, todoId) {
    $.ajax({
      method: 'put',
      url: '/api/todos/' + todoId,
      data: serializedFormData,
      success: json => {
        this.showNavigationPane();
        $('.active-grouping').trigger('click');
      },
    });
  },

  deleteTodo(e) {
    e.stopPropagation();

    const $todo = $(e.target).closest('li.todo');
    const todoId = $todo.attr('data-id');

    $todo.remove();
    this.deleteTodoAjax(todoId);
  },

  deleteTodoAjax(id) {
    $.ajax({
      method: 'delete',
      url: '/api/todos/' + id,
      success: json => {
        this.showNavigationPane();
        this.showAllTodos();
      },
    });
  },

  highlight(e) {
    this.highlightTarget($(e.target).closest('.highlightable'));
  },

  highlightTarget($target) {
    $('.active-grouping').removeClass('active-grouping');
    $target.addClass('active-grouping');
  },

  getTodosByDate(e, json) {
    const groupingId = $(e.currentTarget).closest('section').attr('id');
    const groupingTitle = $(e.target).closest('.grouping').find('p').html();
    const date = this.parseDateFromGroupingTitle(groupingTitle);
    let thisGroupingsTodos;

    if (groupingId === 'completed-todos') json = json.filter(todo => todo.completed);

    if (date) {
      thisGroupingsTodos = json.filter(todo => {
        return todo.month === date.month && todo.year === date.year;
      });
    } else {
      thisGroupingsTodos = json.filter(todo => {
        return todo.month === null && todo.year === null;
      });
    }

    return {
      todos: thisGroupingsTodos,
      listTitle: groupingTitle,
    };
  },

  parseDateFromGroupingTitle(groupingTitle) {
    if (groupingTitle === 'No due date') return null;

    let [mm, yyyy] = groupingTitle.split('/');

    return {month: mm, year: yyyy};
  },

  formatFormDate(formData) {
    formData.forEach(input => {
      if (input.name === 'day' && input.value.length === 1) {
        input.value = input.value.padStart(2, '0');
      }
      if (input.name === 'month') {
        if (this.monthsAsNumbers[input.value].length === 1) {
          input.value = this.monthsAsNumbers[input.value].padStart(2, '0');
        } else {
          input.value = this.monthsAsNumbers[input.value];
        }
      }
    });

    return formData;
  },

  removeLeadingZero(numberAsString) {
    if (!numberAsString) return '';
    return numberAsString[0] === '0' ? numberAsString[1] : numberAsString;
  },

  convertNumToMonth(numAsString) {
    for (let prop in this.monthsAsNumbers) {
      if (this.monthsAsNumbers[prop] === numAsString) return prop;
    }
  },

  groupAllTodosByDate(json) {
    const arrayOfTodosGroups = [];
    const todosGroups = this.groupTodos(json);

    for (let prop in todosGroups) {
      const groupingDate = prop;
      const groupingCount = todosGroups[prop];

      arrayOfTodosGroups.push({date: groupingDate, count: groupingCount})
    }

    arrayOfTodosGroups.sort(this.sortByNoDueDate);

    return arrayOfTodosGroups;
  },

  sortByNoDueDate(a, b) {
    if (a.date === 'No due date') {
      return 1;
    } else if (b.date === 'No due date') {
      return -1;
    } else {
      return 0;
    }
  },

  groupTodos(json) {
    const todosGroups = {};

    json.forEach(todo => {
      let groupingDate;

      if (todo.day && todo.month && todo.year) {
        groupingDate = [todo.month, todo.year].join('/');;
      } else {
        groupingDate = 'No due date';
      }

      todosGroups[groupingDate] = todosGroups[groupingDate] || 0;
      todosGroups[groupingDate] += 1;
    });

    return todosGroups;
  },

  addFormattedTodoDate(json) {
    json.forEach(todo => {
      if (todo.day && todo.month && todo.year) {
        todo.date = [todo.day, todo.month, todo.year].join('/');;
      } else {
        todo.date = 'No due date';
      }
    });
  },

  sortByCompleted(a, b) {
    if (a.completed && !b.completed) {
      return 1;
    } else if (b.completed && !a.completed) {
      return -1;
    } else {
      return 0;
    }
  },

  init() {
    this.createHandlebarsTemplates();
    this.bind();
    this.showNavigationPane();
    this.highlightTarget($('#menu #all-todos .grouping-header'));
    this.showAllTodos();
  },
}

TodoTracker.init();
