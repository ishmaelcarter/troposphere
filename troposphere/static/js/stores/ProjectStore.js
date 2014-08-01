define(
  [
    'underscore',
    'dispatchers/Dispatcher',
    'stores/Store',
    'collections/ProjectCollection',
    'constants/ProjectConstants',
    'controllers/NotificationController',

    'constants/ProjectInstanceConstants',
    './helpers/ProjectInstance',
    './helpers/ProjectInstanceCollection'
  ],
  function (_, Dispatcher, Store, ProjectCollection, ProjectConstants, NotificationController, ProjectInstanceConstants, ProjectInstance, ProjectInstanceCollection) {

    var _projects = null;
    var _isFetching = false;
    var _shouldDoubleCheckIfProjectApiFunctionsAsExpected = false;

    //
    // CRUD Operations
    //

    var fetchProjects = function () {
      if(!_projects && !_isFetching) {
        _isFetching = true;
        var projects = new ProjectCollection();
        projects.fetch().done(function () {
          _isFetching = false;
          _projects = projects;
          ProjectStore.emitChange();
        });
      }
    };

    function create(project){
      project.save().done(function(){
        var successMessage = "Project " + project.get('name') + " created.";
        //NotificationController.success(successMessage);
        ProjectStore.emitChange();
      }).fail(function(){
        var failureMessage = "Error creating Project " + project.get('name') + ".";
        NotificationController.error(failureMessage);
        _projects.remove(project);
        ProjectStore.emitChange();
      });
      _projects.add(project);
    }

    function update(project){
      project.save().done(function(){
        var successMessage = "Project " + project.get('name') + " updated.";
        //NotificationController.success(successMessage);
        ProjectStore.emitChange();
      }).fail(function(){
        var failureMessage = "Error updating Project " + project.get('name') + ".";
        NotificationController.error(failureMessage);
        ProjectStore.emitChange();
      });
    }

    function destroy(project){
      project.destroy().done(function(){
        var successMessage = "Project " + project.get('name') + " deleted.";
        //NotificationController.success(successMessage);
        ProjectStore.emitChange();
      }).fail(function(){
        var failureMessage = "Error deleting Project " + project.get('name') + ".";
        NotificationController.error(failureMessage);
        _projects.add(project);
        ProjectStore.emitChange();
      });
      _projects.remove(project);
    }

    //
    // Project Instance Functions
    //

    function addInstanceToProject(instance, project){
      var projectInstance = new ProjectInstance({
        instance: instance,
        project: project
      });

      project.get('instances').push(instance.toJSON());

      projectInstance.save().done(function(){
        if(_shouldDoubleCheckIfProjectApiFunctionsAsExpected) {
          // refetch the project to make sure the change was also made on the server
          project.fetch().then(function () {
            ProjectStore.emitChange();
          });
        }
      }).fail(function(){
        var failureMessage = "Error adding Instance '" + instance.get('name') + "' to Project '" + project.get('name') + "'.";
        NotificationController.error(failureMessage);

        var indexOfInstance = project.get('instances').map(function(instance){
          return instance.alias;
        }).indexOf(instance.id);

        // remove the instance from the project
        if(indexOfInstance >= 0) {
          project.get('instances').splice(indexOfInstance, 1);
        }

        ProjectStore.emitChange();
      });

      ProjectStore.emitChange();
    }

    function removeInstanceFromProject(instance, project){
      var projectInstance = new ProjectInstance({
        instance: instance,
        project: project
      });

      // remove the instance from the project
      var indexOfInstance = project.get('instances').map(function(instance){
        return instance.alias;
      }).indexOf(instance.id);

      if(indexOfInstance >= 0) {
        project.get('instances').splice(indexOfInstance, 1);
      }

      projectInstance.destroy().done(function(){
        if(_shouldDoubleCheckIfProjectApiFunctionsAsExpected) {
          // refetch the project to make sure the change was also made on the server
          project.fetch().then(function () {
            ProjectStore.emitChange();
          });
        }
      }).fail(function(){
        var failureMessage = "Error removing Instance '" + instance.get('name') + "' from Project '" + project.get('name') + "'.";
        NotificationController.error(failureMessage);

        // add the instance back to the project
        project.get('instances').push(instance.toJSON());

        ProjectStore.emitChange();
      });

      ProjectStore.emitChange();
    }

    //
    // Project Store
    //

    var ProjectStore = {

      get: function (projectId) {
        if(!_projects) {
          fetchProjects();
        } else {
          return _projects.get(projectId);
        }
      },

      getAll: function () {
        if(!_projects) {
          fetchProjects()
        }
        return _projects;
      }

    };

    Dispatcher.register(function (payload) {
      var action = payload.action;

      switch (action.actionType) {
        case ProjectConstants.PROJECT_CREATE:
          create(action.model);
          break;

        case ProjectConstants.PROJECT_UPDATE:
          update(action.model);
          break;

        case ProjectConstants.PROJECT_DESTROY:
          destroy(action.model);
          break;

        case ProjectInstanceConstants.ADD_INSTANCE_TO_PROJECT:
          addInstanceToProject(action.instance, action.project);
          break;

        case ProjectInstanceConstants.REMOVE_INSTANCE_FROM_PROJECT:
          removeInstanceFromProject(action.instance, action.project);
          break;

        default:
          return true;
      }

      ProjectStore.emitChange();

      return true;
    });

    _.extend(ProjectStore, Store);

    return ProjectStore;
  });
